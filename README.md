# VUL Calendar

La storia del mondo ricalibrata sull'**Anno Zero: 1994**, uscita di *Voglio Una
Lurida* degli Articolo 31. Gli anni si contano in **aVUL** e **dVUL**.

Il calendario VUL, a differenza di quello canonico, **ha** un anno zero — perché
l'anno zero è l'evento. Conseguenza: la nascita di Cristo cade nel 1993 aVUL.

## Le tre tracce

| traccia | cosa contiene | provenienza |
|---|---|---|
| `storia` | eventi rilevanti dal 1900 a oggi + ~100 pre-1900 | Wikidata + curati a mano |
| `lurido` | hip hop, Italia, anni novanta | curati a mano |
| `naqp` | *Non Aprite Quella Podcast*, collocato sull'anno del **caso raccontato** | feed pubblico + campagna Patreon |

## Sviluppo

```bash
npm install
npm run etl        # rigenera i dati (lento, va in rete)
npm run dev
npm test
```

## Dati

L'ETL gira **in locale** e committa uno snapshot in `public/data/`. Il sito
non chiama nessuna API a runtime: si apre anche se Wikidata è giù.

- `npm run etl` — pipeline completa
- `npm run etl:dates` — propone anni per gli episodi NAQP non datati

### Da dove viene l'anno di un episodio

Dall'incipit che l'episodio dà a sé stesso — "*Siamo a Napoli, nel 1993…*" —
disponibile sia nel feed pubblico sia sulla campagna Patreon.

Sul lato Patreon il campo giusto è **`content_teaser_text`**: `content` e
`teaser_text` esistono nello schema ma tornano sempre `null`, e fanno sembrare
che l'incipit sia dietro il paywall. Non lo è: è lo stesso testo che si vede
aprendo la pagina da un browser non loggato. Il corpo dell'episodio invece resta
a pagamento e non viene toccato.

Restano una sessantina di episodi che non si datano da sé. Per quelli
`resolve-dates.mjs` propone un anno cercando il nome del caso su Wikipedia, ma
scrive solo **proposte** in `data/generated/naqp-dates.proposals.json`, perché
quel metodo ha il **67% di precisione** e il 33% restante sono anni *sbagliati
con sicurezza*:

- `Il Caso Rasputin` → un libro del 2011, non l'omicidio del 1916
- `Il Caso di Woodstock '99` → il festival del 1969
- `Il Caso H.H. Holmes` → Sherlock Holmes

Su una timeline un anno sbagliato non si vede: è peggio di un buco. In timeline
finisce solo ciò che è confermato in `data/naqp-dates.json`, che serve a coprire
i buchi: se l'episodio si data da sé, vince il suo inquadramento.

Due trappole dell'italiano, trovate sui dati veri e coperte da test:

- "*anni 2000*" è un decennio, non l'anno 2000
- "*alla fine del 1800*" è il secolo: collocarlo nel 1800 sbaglia di novant'anni,
  quindi quei casi restano senza anno e passano per la curation

### Limiti noti

- Il feed pubblico è una finestra scorrevole (147 episodi su ~209 pubblicati):
  lo snapshot committato è l'unica copia degli episodi che ne sono usciti.
- Prima del 1582 il gregoriano è prolettico e non coincide col giuliano. Le
  conversioni antiche sono goliardiche, non filologiche, e l'app lo dichiara.
- Di NAQP salviamo titolo, anno, incipit pubblico e link. Il contenuto a
  pagamento non viene toccato.

## Deploy

Cloudflare Pages, sito statico:

- build: `npm run build`
- output: `dist`
- nessuna variabile d'ambiente, nessun segreto (l'ETL è già girato in locale)
