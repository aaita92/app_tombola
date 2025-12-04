# Tombola Prize Manager

Gestione semplice dei premi per una tombola.

Questa applicazione permette di:

- Definire un catalogo di premi (descrizione, prezzo, tag, quantità)
- Calcolare automaticamente la suddivisione del budget premi (Terna/Quaterna/Cinquina/Tombola)
- Generare una selezione di premi rispettando il budget
- Confermare e salvare estrazioni nello storico
- Importare / esportare premi ed estrazioni in Excel

Caratteristica importante (modificata):
- La configurazione ora prende direttamente l'"Incasso per Estrazione" (valore totale incassato in euro per quella singola estrazione). Non più "numero schede vendute" + "prezzo per scheda".
  - Se in memoria esiste la vecchia configurazione con `schedeVendute` e `prezzoScheda`, all'avvio verrà calcolato automaticamente `incasso = schedeVendute * prezzoScheda` per retrocompatibilità.


## Requisiti

- Node.js (>=16)
- npm

## Sviluppo locale

1. Installa le dipendenze:

```bash
make install
```

2. Avvia il dev server (Vite):

```bash
make dev
# oppure
npm run dev
```

L'app sarà disponibile su http://localhost:5173 (o la porta mostrata da Vite).

## Build di produzione

Per creare la build ottimizzata:

```bash
make build
# oppure
npm run build
```

I file di produzione saranno generati nella cartella `dist/`.

## Deploy su GitHub Pages (automazione con Makefile)

La Makefile include un target `deploy-gh-pages` che costruisce il progetto e pubblica il contenuto della cartella `dist/` sulla branch `gh-pages` del repository remoto.

Esempio di utilizzo:

```bash
make deploy-gh-pages
```

Cosa fa il target:

- Esegue `npm run build`
- Copia `dist/*` in una cartella temporanea
- Inizializza un repository Git temporaneo in quella cartella
- Commit dei file e push forzato su `origin/gh-pages`

Nota: il deploy presuppone che `origin` sia impostato sul tuo repository GitHub. Il Makefile cerca automaticamente l'URL remoto con `git config --get remote.origin.url`.

Se preferisci metodi alternativi, puoi usare:

- `gh-pages` package (npm) — semplicissimo: aggiungi `gh-pages` e configura lo script `deploy`
- `git subtree` o `git worktree` (più avanzato)

## Modalità di configurazione

Nella tab "Configurazione Estrazione" trovi il campo `Incasso per Estrazione (€)` che è il valore usato per calcolare il budget totale per i premi (applicando la percentuale `Percentuale Entrate per Premi`). Le percentuali per `Terna`, `Quaterna`, `Cinquina`, `Tombola` definiscono la ripartizione del budget premi.

## Storico ed esportazione

- Lo storico conserva per ogni estrazione: data, incasso, costo totale premi, scostamento e i premi assegnati per categoria.
- Puoi esportare lo storico e il catalogo premi in Excel dalla UI.

## Note tecniche

- L'app è costruita con React + Vite + TailwindCSS.
- L'esportazione/importazione Excel è gestita tramite `xlsx`.

## Problemi comuni

- Se `make deploy-gh-pages` fallisce, controlla che tu abbia i permessi per pushare su `origin/gh-pages` e che l'URL remoto sia corretto.
- Se preferisci che la branch `gh-pages` venga gestita in un modo specifico (es. includere `CNAME`, file aggiuntivi, o usare directory `docs/`), fammi sapere e adatto lo script.

---

Se vuoi, posso anche:

- Aggiungere uno script `npm run deploy` che chiama il target Makefile
- Supportare `CNAME` per un dominio personalizzato
- Integrare `gh-pages` npm package per un deploy ancora più semplice
