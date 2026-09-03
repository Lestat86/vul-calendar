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

### Perché gli anni NAQP si confermano a mano

Gli esclusivi Patreon non hanno description pubbliche, quindi l'unico aggancio
è il nome del caso nel titolo. Risolverlo automaticamente su Wikipedia dà **67%
di precisione**, e il 33% restante sono anni *sbagliati con sicurezza*:

- `Il Caso Rasputin` → un libro del 2011, non l'omicidio del 1916
- `Il Caso di Woodstock '99` → il festival del 1969
- `Il Caso H.H. Holmes` → Sherlock Holmes

Su una timeline un anno sbagliato non si vede: è peggio di un buco. Quindi
`resolve-dates.mjs` scrive solo **proposte** in
`data/generated/naqp-dates.proposals.json`, e in timeline finisce esclusivamente
ciò che è stato confermato in `data/naqp-dates.json`.

Il feed pubblico è diverso: l'anno viene dall'incipit dell'episodio stesso
("*Siamo a Napoli, nel 1993…*"), quindi è affidabile e viene usato direttamente.

### Limiti noti

- Il feed pubblico è una finestra scorrevole (147 episodi su ~209 pubblicati):
  lo snapshot committato è l'unica copia degli episodi che ne sono usciti.
- Prima del 1582 il gregoriano è prolettico e non coincide col giuliano. Le
  conversioni antiche sono goliardiche, non filologiche, e l'app lo dichiara.
- Di NAQP salviamo solo titolo, anno e link. Nessun contenuto a pagamento.

## Deploy

Cloudflare Pages, sito statico:

- build: `npm run build`
- output: `dist`
- nessuna variabile d'ambiente, nessun segreto (l'ETL è già girato in locale)
