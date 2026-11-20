import test from "node:test";
import assert from "node:assert/strict";
import { normalizarMac, ehAparelho, macAleatorio, lerArpWindows, lerIpNeigh, lerProcArp, classificar } from "./vigia-lan.mjs";

test("MAC normalizado em minúsculas com dois-pontos, qualquer que seja a grafia de entrada", () => {
  assert.equal(normalizarMac("A4-C3-F0-11-22-33"), "a4:c3:f0:11:22:33");
  assert.equal(normalizarMac("a4c3.f011.2233"), "a4:c3:f0:11:22:33");
  assert.equal(normalizarMac("curto"), null);
});

test("broadcast e multicast não contam como aparelho; MAC aleatório é reconhecido", () => {
  assert.equal(ehAparelho("ff:ff:ff:ff:ff:ff"), false);
  assert.equal(ehAparelho("01:00:5e:00:00:fb"), false);
  assert.equal(ehAparelho("a4:c3:f0:11:22:33"), true);
  assert.equal(macAleatorio("da:a1:19:00:00:01"), true);
  assert.equal(macAleatorio("a4:c3:f0:11:22:33"), false);
});

test("lê a tabela ARP do Windows em português", () => {
  const texto = `
Interface: 192.168.0.5 --- 0x7
  Endereço IP           Endereço físico       Tipo
  192.168.0.1           a4-c3-f0-11-22-33     dinâmico
  192.168.0.23          da-a1-19-00-00-01     dinâmico
  192.168.0.255         ff-ff-ff-ff-ff-ff     estático
  224.0.0.22            01-00-5e-00-00-16     estático`;
  assert.deepEqual(lerArpWindows(texto).map((x) => x.ip), ["192.168.0.1", "192.168.0.23", "192.168.0.255", "224.0.0.22"]);
});

test("lê ip neigh do Linux e ignora vizinho que não respondeu", () => {
  const texto = [
    "192.168.0.1 dev wlan0 lladdr a4:c3:f0:11:22:33 REACHABLE",
    "192.168.0.40 dev wlan0 lladdr 00:11:22:33:44:55 STALE",
    "192.168.0.41 dev wlan0 FAILED",
    "192.168.0.42 dev wlan0 lladdr 00:11:22:33:44:66 FAILED",
  ].join("\n");
  assert.deepEqual(lerIpNeigh(texto), [
    { ip: "192.168.0.1", mac: "a4:c3:f0:11:22:33" },
    { ip: "192.168.0.40", mac: "00:11:22:33:44:55" },
  ]);
});

test("lê /proc/net/arp e descarta a entrada incompleta", () => {
  const texto = [
    "IP address       HW type     Flags       HW address            Mask     Device",
    "192.168.0.1      0x1         0x2         a4:c3:f0:11:22:33     *        wlan0",
    "192.168.0.77     0x1         0x0         00:00:00:00:00:00     *        wlan0",
  ].join("\n");
  assert.deepEqual(lerProcArp(texto), [{ ip: "192.168.0.1", mac: "a4:c3:f0:11:22:33" }]);
});

test("bloqueado que reaparece vem primeiro, depois o desconhecido, depois o conhecido", () => {
  const vizinhos = [
    { ip: "192.168.0.1", mac: "a4:c3:f0:11:22:33" },
    { ip: "192.168.0.40", mac: "00:11:22:33:44:55" },
    { ip: "192.168.0.50", mac: "00:aa:bb:cc:dd:ee" },
    { ip: "192.168.0.255", mac: "ff:ff:ff:ff:ff:ff" },
    { ip: "192.168.0.1", mac: "a4:c3:f0:11:22:33" },
  ];
  const conhecidos = { "a4:c3:f0:11:22:33": { nome: "roteador" }, "00:aa:bb:cc:dd:ee": { nome: "tv box", bloqueado: true } };
  const r = classificar(vizinhos, conhecidos);
  assert.deepEqual(r.map((x) => x.estado), ["BLOQUEADO-MAS-PRESENTE", "DESCONHECIDO", "conhecido"]);
  assert.equal(r.length, 3, "repetido e broadcast saem");
});
