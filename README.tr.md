<p align="center"><img src="assets/wordmark.svg" width="520" alt="product-engineer"></p>

<p align="center"><a href="README.md">English</a> | Türkçe | <a href="README.zh-CN.md">简体中文</a></p>

<p align="center"><em>Ajanınız kod gönderiyor. product-engineer sonuç göndermesini sağlar.</em></p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Bubblegunn/product-engineer?style=flat-square&color=111111" alt="stars">
  <img src="https://img.shields.io/badge/dependencies-0-111111?style=flat-square" alt="zero dependencies">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
  <a href="https://github.com/marketplace/actions/product-engineer-check"><img src="https://img.shields.io/badge/GitHub_Marketplace-product--engineer--check-111111?style=flat-square&logo=github" alt="GitHub Marketplace"></a>
</p>

Bir yapay zekâ kodlama ajanının kod yazıcı gibi değil, ürün mühendisi gibi düşünmesini
sağlayan bir ajan skill'i. Yapmadan önce işi bir müşteri sonucu olarak yeniden yazar. Her
commit ve pull request'e sade dilde bir "For the customer" bloğu ekler. Gözlemlemediği işe
"bitti" demez, bilerek yapmadığını adıyla söyler ve saymadığı bir rakamı asla yazmaz.

## 30 saniyede kurulum

```
npx skills add Bubblegunn/product-engineer
```

Bu, [skills.sh](https://skills.sh) kurucusudur. Projedeki ajanları algılar ve skill'i her biri
için yerleştirir; `--all` desteklenen bütün ajanları hedefler, `-g` proje yerine kullanıcı
düzeyine kurar.

Her ajanda dosyanın nereye düştüğü, Claude Code plugin komutları, git kancası ve CI adımı
[`docs/install.md`](docs/install.md) içinde. Depo dört skill taşır: `product-engineer` (yedi
kural), `customer-block` (yalnız müşteri bloğu), `done-means-observed` (yalnız gözlemlenmiş
"bitti" raporu) ve `release-notes` (kod yazmayan, sürüm notu yazan ajan için).

Skill'ler düz metin dosyasıdır, kurulum gerektirmez. `product-engineer` komutu (`check`,
`doctor`, pre-commit girişi) Node 22 veya daha yenisini ister; commit-msg kancası POSIX sh'tir.

## Öncesi ve sonrası

Öncesi:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment
```

Sonrası:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment

For the customer:
What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.
```

Öncesinde ajan şöyle rapor ediyordu:

```
Done. All 42 tests pass.
```

Sonrasında:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
Not shipped:
- Dead-letter queue: three retries cover every failure in 90 days of logs.
```

## Yedi kural

1. Yapmadan önce yeniden yaz. Tek cümlelik müşteri sonucu, ya da tek soru.
2. Her seferinde müşteri için. Ne değişti, neden önemli, otomasyon etkisi yalnızca gerçekse.
3. Bitti demek gözlemlemektir. Log, veri ya da gerçek cihaz; ya da neyi kontrol edemediğini söyle.
4. İsteneni yap, yapmadığını adıyla söyle. Gerekçeli bir `Not shipped:` listesi.
5. Sayılmamış rakam yok. Her rakamın arkasında bir komut ve bir kapsam var.
6. Paydaşın dilinde konuş. Skill ile birlikte jargon-sade dil tablosu gelir.
7. Metriği hareket ettiren en küçük değişiklik. Her tasarımdan önce tek satırlık bir defter kaydı.

Tam metin: [`skills/product-engineer/SKILL.md`](skills/product-engineer/SKILL.md). Şablon,
beş soru, bitti listesi, sade dil tablosu ve not-shipped biçimi
[`references/`](skills/product-engineer/references/) altında.

## Ne yapmaz

Süreç yürütmez, iş akışı sahiplenmez; spec, TDD ve inceleme skill'leriyle birlikte çalışır.
Ürün stratejisi yazmaz. Kancayı kurmadıkça hiçbir şeyi zorlamaz.

## Nereden geliyor

Bunlar Efe Genç'in dört yıl boyunca bir konaklama platformunda kurucu mühendis olarak ve
proaktif bir asistanın tek yazarı olarak çalıştığı kurallar: her değişikliği teknik olmayan
bir okura anlatan bir commit geleneği, işi çalışırken izlemek anlamına gelen bir "bitti"
tanımı ve bilerek yapılmayanı yazma alışkanlığı
([The feature I chose not to ship](https://efe-genc-portfolio.vercel.app/writing/the-feature-i-chose-not-to-ship/)).

## Katkı

Kural değişiklikleri bir öncesi/sonrası çifti ister; bkz. [CONTRIBUTING.md](CONTRIBUTING.md).
[Yol haritası](ROADMAP.md) bilerek kısa. Çeviriler ve dile özgü jargon tabloları
`good first issue` etiketli.

## Atıf

Her sürüm Zenodo'da bir DOI ile arşivleniyor.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22395211.svg)](https://doi.org/10.5281/zenodo.22395211)

Bu **kavram** DOI'si: her zaman en yeni sürüme çözümlenir. Belirli bir sürümü atıflamak için
o sayfada yan çubuktan sürümü seçin. Depodaki `CITATION.cff` aynı tanımlayıcıyı taşıyor.

## Yıldızlar

<a href="https://star-history.com/#Bubblegunn/product-engineer&Date"><img src="https://api.star-history.com/svg?repos=Bubblegunn/product-engineer&type=Date" width="520" alt="Star history"></a>

MIT.
