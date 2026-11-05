import { test } from "node:test";
import assert from "node:assert/strict";
import { ipPrivee, verifierFormeUrl } from "../src/lib/url-sure";

test("SSRF : adresses privées refusées", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.10", "169.254.169.254",
                    "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) {
    assert.equal(ipPrivee(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "41.138.96.1", "172.32.0.1", "2001:4860:4860::8888"]) {
    assert.equal(ipPrivee(ip), false, ip);
  }
});

test("SSRF : forme des URL publiées", () => {
  assert.equal(verifierFormeUrl("https://api.exemple.com/v1").ok, true);
  assert.equal(verifierFormeUrl("http://api.exemple.com").ok, false);
  assert.equal(verifierFormeUrl("https://localhost:3000").ok, false);
  assert.equal(verifierFormeUrl("https://127.0.0.1/").ok, false);
  assert.equal(verifierFormeUrl("https://[::1]/").ok, false);
  assert.equal(verifierFormeUrl("https://user:mdp@api.exemple.com").ok, false);
  assert.equal(verifierFormeUrl("internal:/demo-apis/qrcode").ok, false);
  assert.equal(verifierFormeUrl("file:///etc/passwd").ok, false);
});
