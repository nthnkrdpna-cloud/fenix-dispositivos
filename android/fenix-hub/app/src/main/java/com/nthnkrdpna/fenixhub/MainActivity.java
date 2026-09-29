package com.nthnkrdpna.fenixhub;

import android.app.*;
import android.app.usage.UsageStatsManager;
import android.content.*;
import android.content.pm.*;
import android.net.*;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.*;
import android.provider.Settings;
import android.webkit.*;
import android.widget.Toast;
import java.util.*;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView web;

    private static final String[] AUTOMATION_PACKAGES = new String[]{
        "com.arlosoft.macrodroid",
        "net.dinglisch.android.taskerm",
        "com.llamalab.automate",
        "com.automateitapp.automateit"
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0A0F17);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "Fenix");
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
    }

    private String deviceJson() {
        String model = Build.MANUFACTURER + " " + Build.MODEL;
        String release = Build.VERSION.RELEASE;
        int sdk = Build.VERSION.SDK_INT;
        String ip = "unknown";
        try {
            WifiManager wm = (WifiManager)getApplicationContext().getSystemService(WIFI_SERVICE);
            WifiInfo wi = wm.getConnectionInfo();
            int v = wi.getIpAddress();
            ip = String.format(Locale.US,"%d.%d.%d.%d",v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255);
        } catch (Exception ignored) {}
        boolean termux = getPackageManager().getLaunchIntentForPackage("com.termux") != null;
        return "{\"model\":\"" + esc(model) + "\",\"android\":\"" + esc(release) + "\",\"sdk\":" + sdk + ",\"ip\":\"" + esc(ip) + "\",\"termux\":" + termux + "}";
    }

    private String automationAuditJson() {
        PackageManager pm = getPackageManager();
        StringBuilder out = new StringBuilder();
        out.append("{\"protocol\":\"fenix-android-audit/1\",");
        out.append("\"read_only\":true,");
        out.append("\"root_required\":false,");
        out.append("\"package_visibility\":\"selective\",");
        out.append("\"usage_access_for_fenix\":").append(hasUsageAccess(getPackageName())).append(",");
        out.append("\"enabled_accessibility\":\"").append(esc(setting(Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES))).append("\",");
        out.append("\"enabled_notification_listeners\":\"").append(esc(setting(Settings.Secure.ENABLED_NOTIFICATION_LISTENERS))).append("\",");
        out.append("\"automation_apps\":[");
        for (int i = 0; i < AUTOMATION_PACKAGES.length; i++) {
            if (i > 0) out.append(",");
            out.append(packageAudit(pm, AUTOMATION_PACKAGES[i]));
        }
        out.append("],");
        out.append("\"limitation\":\"private workflow data remains inside each app sandbox unless the app exposes an export/API; this audit does not bypass Android sandboxing\"");
        out.append("}");
        return out.toString();
    }

    private String packageAudit(PackageManager pm, String pkg) {
        try {
            PackageInfo pi = pm.getPackageInfo(pkg, PackageManager.GET_PERMISSIONS | PackageManager.GET_SERVICES | PackageManager.GET_RECEIVERS | PackageManager.GET_ACTIVITIES);
            ApplicationInfo ai = pi.applicationInfo;
            int exportedServices = 0, exportedReceivers = 0, exportedActivities = 0;
            if (pi.services != null) for (ServiceInfo s : pi.services) if (s.exported) exportedServices++;
            if (pi.receivers != null) for (ActivityInfo r : pi.receivers) if (r.exported) exportedReceivers++;
            if (pi.activities != null) for (ActivityInfo a : pi.activities) if (a.exported) exportedActivities++;
            StringBuilder perms = new StringBuilder("[");
            if (pi.requestedPermissions != null) {
                for (int i = 0; i < pi.requestedPermissions.length; i++) {
                    if (i > 0) perms.append(",");
                    String p = pi.requestedPermissions[i];
                    boolean granted = pm.checkPermission(p, ai.uid) == PackageManager.PERMISSION_GRANTED;
                    perms.append("{\"name\":\"").append(esc(p)).append("\",\"granted\":").append(granted).append("}");
                }
            }
            perms.append("]");
            return "{\"package\":\"" + esc(pkg) + "\",\"installed\":true,\"version\":\"" +
                esc(pi.versionName == null ? "" : pi.versionName) + "\",\"enabled\":" + ai.enabled +
                ",\"uid\":" + ai.uid + ",\"usage_access\":" + hasUsageAccess(pkg) +
                ",\"exported_services\":" + exportedServices + ",\"exported_receivers\":" + exportedReceivers +
                ",\"exported_activities\":" + exportedActivities + ",\"requested_permissions\":" + perms + "}";
        } catch (PackageManager.NameNotFoundException e) {
            return "{\"package\":\"" + esc(pkg) + "\",\"installed\":false}";
        } catch (Exception e) {
            return "{\"package\":\"" + esc(pkg) + "\",\"installed\":\"unknown\",\"error\":\"" + esc(e.getClass().getSimpleName()) + "\"}";
        }
    }

    private boolean hasUsageAccess(String pkg) {
        try {
            ApplicationInfo ai = getPackageManager().getApplicationInfo(pkg, 0);
            AppOpsManager ops = (AppOpsManager)getSystemService(APP_OPS_SERVICE);
            return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, ai.uid, pkg) == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    private String setting(String key) {
        try {
            String value = Settings.Secure.getString(getContentResolver(), key);
            return value == null ? "" : value;
        } catch (Exception e) {
            return "unavailable:" + e.getClass().getSimpleName();
        }
    }

    private static String esc(String s) {
        return s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r");
    }

    public class Bridge {
        @JavascriptInterface public String device() { return deviceJson(); }
        @JavascriptInterface public String auditAutomation() { return automationAuditJson(); }

        @JavascriptInterface public void openTermux() {
            Intent i=getPackageManager().getLaunchIntentForPackage("com.termux");
            if(i==null){toast("Termux não instalado");return;}
            startActivity(i);
        }

        @JavascriptInterface public void termuxCommand(String command) {
            if(command==null || !isAllowedCommand(command)) { toast("Comando Fênix não autorizado"); return; }
            try {
                Intent i=new Intent("com.termux.RUN_COMMAND");
                i.setClassName("com.termux","com.termux.app.RunCommandService");
                i.putExtra("com.termux.RUN_COMMAND_PATH","/data/data/com.termux/files/usr/bin/bash");
                i.putExtra("com.termux.RUN_COMMAND_ARGUMENTS",new String[]{"-lc",command});
                i.putExtra("com.termux.RUN_COMMAND_WORKDIR","/data/data/com.termux/files/home");
                i.putExtra("com.termux.RUN_COMMAND_BACKGROUND",true);
                i.putExtra("com.termux.RUN_COMMAND_LABEL","Fênix Hub");
                startService(i);
                toast("Comando enviado ao Termux");
            } catch(Exception e) { toast("Termux não está autorizado: "+e.getClass().getSimpleName()); }
        }

        @JavascriptInterface public void settings(String kind) {
            try {
                Intent i;
                if("wireless".equals(kind)) i=new Intent(Settings.ACTION_WIRELESS_SETTINGS);
                else if("developer".equals(kind)) i=new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
                else if("battery".equals(kind)) i=new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                else if("accessibility".equals(kind)) i=new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                else if("usage".equals(kind)) i=new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                else i=new Intent(Settings.ACTION_SETTINGS);
                startActivity(i);
            } catch(Exception e){toast("Configuração indisponível");}
        }

        @JavascriptInterface public void openUrl(String url) {
            if(url==null || !(url.startsWith("https://") || url.startsWith("http://"))) return;
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        }

        private boolean isAllowedCommand(String command) {
            return command.equals("node scripts/fenix.mjs status")
                || command.equals("node scripts/fenix.mjs fleet discover")
                || command.equals("node scripts/fenix.mjs fleet optimize")
                || command.equals("node scripts/fenix.mjs fleet rollback")
                || command.equals("node scripts/fenix.mjs network discover")
                || command.startsWith("node scripts/fenix.mjs vault harvest ")
                || command.equals("node scripts/fenix.mjs quota status");
        }

        private void toast(String s){ runOnUiThread(()->Toast.makeText(MainActivity.this,s,Toast.LENGTH_SHORT).show()); }
    }
}
