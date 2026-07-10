# Zvenegram

Ett datadrivet svenskt ordspel byggt med React, TypeScript och Vite. Appen är helt statisk och kan publiceras direkt på Cloudflare Pages.

## Kom igång

```bash
npm install
npm run dev
```

Skapa en produktionsversion med `npm run build`. Den färdiga statiska sajten hamnar i `dist/`.

För Cloudflare Pages används:

- Build command: `npm run build`
- Build output directory: `dist`

## Pusseldata

Pusslen finns i `src/data/puzzles.json`. Ett pussel innehåller alltid exakt 16 noder och valfritt antal ord. Alla ord måste vara minst fyra bokstäver:

```json
{
  "id": "unikt-id",
  "title": "Pusslets namn",
  "difficulty": "Lätt",
  "nodes": [
    { "id": "m1", "letter": "M", "x": 12, "y": 16 }
  ],
  "words": [
    { "word": "MAT", "path": ["m1", "a1", "t1"] }
  ]
}
```

Noderna placeras enligt `layout` i ett fast 4×4-rutnät med jämna avstånd. Varje steg i ett ord måste gå till en direkt granncirkel i 0°, 45°, 90° eller motsvarande riktning. Ett streck får aldrig passera eller hoppa över en annan cirkel. Samma streck får bara användas en gång inom ett ord. Dessa regler valideras automatiskt när spelet laddas. Ett ord kan hittas i båda riktningarna. När en nod inte längre ingår i något olöst ord tas den automatiskt bort.

Spelplanens linjer kan anges separat med `edges`, exempelvis `[["a1", "b1"], ["b1", "c1"]]`. Spelaren kan följa alla synliga linjer även när kombinationen inte ingår i något ord. Om `edges` utelämnas skapas linjenätet automatiskt från ordens vägar. En linje ligger kvar så länge båda dess cirklar fortfarande behövs av olösta ord.

Alla ord måste ingå i ett sammanhängande ordnät. Varje ord ska dela minst en bokstavscirkel med ett annat ord, direkt eller genom en kedja av överlappande ord. Fristående ordgrupper stoppas av den automatiska pusselvalideringen.

Ett fullständigt ord får inte ingå i ett annat längre ord. Kombinationer som `BÄCK`/`BÄCKEN`, `BORD`/`MATBORD` och `FISK`/`FISKA` stoppas automatiskt. Orden får fortfarande dela enskilda bokstäver och delar av sina vägar för att bilda ett sammanhängande pussel.

Webbläsarens `localStorage` används för statistik. Ingen speldata skickas till en server.
