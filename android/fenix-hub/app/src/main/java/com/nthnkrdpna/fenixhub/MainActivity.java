package com.nthnkrdpna.fenixhub;

import android.app.*;
import android.content.*;
import android.net.*;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.*;
import android.provider.Settings;
import android.webkit.*;
import android.widget.Toast;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView web;

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
        return "{\"model\":\""+esc(model)+"\",\"android\":\""+esc(release)+"\",\"sdk\":"+sdk+",\"ip\":\""+esc(ip)+"\",\"termux\":"+termux+"}";
    }

    private static String esc(String s) { return s.replace("\\","\\\\").replace("\"","\\\""); }

    public class Bridge {
        @JavascriptInterface public String device() { return deviceJson(); }

        @JavascriptInterface public void openTermux() {
            Intent i=getPackageManager().getLaunchIntentForPackage("com.termux");
            if(i==null){toast("Termux não instalado");return;}
            startActivity(i);
        }

        @JavascriptInterface public void termuxCommand(String command) {
            if(command==null || !command.matches("[a-zA-Z0-9_./ -]{1,200}")) { toast("Comando recusado"); return; }
            try {
                Intent i=new Intent("com.termux.RUN_COMMAND");
                i.setClassName("com.termux","com.termux.app.RunCommandService");
                i.putExtra("com.termux.RUN_COMMAND_PATH","/data/data/com.termux/files/usr/bin/bash");
                i.putExtra("com.termux.RUN_COMMAND_ARGUMENTS",new String[]{"-lc",command});
                i.putExtra("com.termux.RUN_COMMAND_WORKDIR","/data/data/com.termux/files/home");
                i.putExtra("com.termux.RUN_COMMAND_BACKGROUND",true);
                i.putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL","Fênix Hub");
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
                else i=new Intent(Settings.ACTION_SETTINGS);
                startActivity(i);
            } catch(Exception e){toast("Configuração indisponível");}
        }

        @JavascriptInterface public void openUrl(String url) {
            if(url==null || !(url.startsWith("https://") || url.startsWith("http://"))) return;
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        }

        private void toast(String s){ runOnUiThread(()->Toast.makeText(MainActivity.this,s,Toast.LENGTH_SHORT).show()); }
    }
}
