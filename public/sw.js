// Service worker minimal untuk instalabilitas PWA.
// Sengaja TANPA caching: semua permintaan tetap ke jaringan agar data
// (stok, HPP, penjualan) selalu segar dan server action tidak terganggu.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
