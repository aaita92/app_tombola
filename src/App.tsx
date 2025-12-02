import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, RotateCcw, Check, X, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const TombolaPrizeManager = () => {
  const [activeTab, setActiveTab] = useState('premi');
  const [prizes, setPrizes] = useState([]);
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState({
    schedeVendute: 100,
    prezzoScheda: 5,
    percEntrate: 70,
    percTerna: 15,
    percQuaterna: 20,
    percCinquina: 25,
    percTombola: 40
  });
  const [newPrize, setNewPrize] = useState({ descrizione: '', prezzo: '', tag: '', quantita: 1 });
  const [selectedPrizes, setSelectedPrizes] = useState(null);
  const [editingPrize, setEditingPrize] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingPrizeId, setEditingPrizeId] = useState(null);
  const [prizeQuantitySelector, setPrizeQuantitySelector] = useState(null);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const prizesData = await window.storage.get('tombola-prizes');
      const historyData = await window.storage.get('tombola-history');
      const configData = await window.storage.get('tombola-config');
      
      if (prizesData) setPrizes(JSON.parse(prizesData.value));
      if (historyData) setHistory(JSON.parse(historyData.value));
      if (configData) setConfig(JSON.parse(configData.value));
    } catch (error) {
      console.log('No previous data found');
    }
  };

  const saveData = async () => {
    try {
      await window.storage.set('tombola-prizes', JSON.stringify(prizes));
      await window.storage.set('tombola-history', JSON.stringify(history));
      await window.storage.set('tombola-config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  useEffect(() => {
    saveData();
  }, [prizes, history, config]);

  const addPrize = () => {
    if (newPrize.descrizione && newPrize.prezzo && newPrize.tag && newPrize.quantita) {
      const prize = {
        id: Date.now(),
        descrizione: newPrize.descrizione,
        prezzo: parseFloat(newPrize.prezzo),
        tag: newPrize.tag,
        quantita: parseInt(newPrize.quantita)
      };
      setPrizes([...prizes, prize]);
      setNewPrize({ descrizione: '', prezzo: '', tag: '', quantita: 1 });
    }
  };

  const deletePrize = (id) => {
    setPrizes(prizes.filter(p => p.id !== id));
  };

  const editPrize = (id) => {
    const prize = prizes.find(p => p.id === id);
    if (prize) {
      setNewPrize(prize);
      setEditingPrizeId(id);
    }
  };

  const updatePrize = () => {
    if (newPrize.descrizione && newPrize.prezzo && newPrize.tag && newPrize.quantita) {
      setPrizes(prizes.map(p => 
        p.id === editingPrizeId 
          ? {
              ...p,
              descrizione: newPrize.descrizione,
              prezzo: parseFloat(newPrize.prezzo),
              tag: newPrize.tag,
              quantita: parseInt(newPrize.quantita)
            }
          : p
      ));
      setNewPrize({ descrizione: '', prezzo: '', tag: '', quantita: 1 });
      setEditingPrizeId(null);
    }
  };

  const cancelEdit = () => {
    setNewPrize({ descrizione: '', prezzo: '', tag: '', quantita: 1 });
    setEditingPrizeId(null);
  };

  const calculateBudgets = () => {
    const totale = config.schedeVendute * config.prezzoScheda;
    const budgetTotale = totale * (config.percEntrate / 100);
    return {
      totale,
      budgetTotale,
      terna: budgetTotale * (config.percTerna / 100),
      quaterna: budgetTotale * (config.percQuaterna / 100),
      cinquina: budgetTotale * (config.percCinquina / 100),
      tombola: budgetTotale * (config.percTombola / 100)
    };
  };

  const findBestPrizeCombination = (availablePrizes, targetBudget, usedTags, previousPrizes) => {
    const candidates = availablePrizes.filter(p => p.quantita > 0);
    if (candidates.length === 0) return [];

    let bestCombination = [];
    let bestDiff = Infinity;

    // Try single prizes
    for (const prize of candidates) {
      if (prize.prezzo <= targetBudget) {
        const diff = Math.abs(targetBudget - prize.prezzo);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestCombination = [{ ...prize, qty: 1 }];
        }
      }
    }

    // Try combinations of 2-3 prizes
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i; j < candidates.length; j++) {
        const prize1 = candidates[i];
        const prize2 = candidates[j];
        
        // Try different quantities
        for (let q1 = 1; q1 <= Math.min(prize1.quantita, 3); q1++) {
          for (let q2 = (i === j ? q1 : 1); q2 <= Math.min(prize2.quantita, 3); q2++) {
            if (i === j && q1 === q2) continue;
            
            const total = prize1.prezzo * q1 + (i !== j ? prize2.prezzo * q2 : 0);
            if (total <= targetBudget) {
              const diff = Math.abs(targetBudget - total);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestCombination = i === j 
                  ? [{ ...prize1, qty: q1 }]
                  : [{ ...prize1, qty: q1 }, { ...prize2, qty: q2 }];
              }
            }
          }
        }
      }
    }

    return bestCombination;
  };

  const generatePrizeSelection = () => {
    const budgets = calculateBudgets();
    const categories = [
      { name: 'terna', budget: budgets.terna },
      { name: 'quaterna', budget: budgets.quaterna },
      { name: 'cinquina', budget: budgets.cinquina },
      { name: 'tombola', budget: budgets.tombola }
    ];

    const selection = {};
    const usedTags = [];
    const previousPrizes = history.flatMap(h => 
      ['terna', 'quaterna', 'cinquina', 'tombola'].flatMap(cat => h[cat] || [])
    );

    categories.forEach(cat => {
      const combination = findBestPrizeCombination(prizes, cat.budget, usedTags, previousPrizes);
      if (combination.length > 0) {
        selection[cat.name] = combination;
        combination.forEach(p => usedTags.push(p.tag));
      } else {
        selection[cat.name] = [];
      }
    });

    return selection;
  };

  const calculateCosts = (selection) => {
    if (!selection) return { totale: 0, scostamento: 0 };
    const budgets = calculateBudgets();
    const costs = {
      terna: selection.terna?.reduce((sum, p) => sum + (p.prezzo * p.qty), 0) || 0,
      quaterna: selection.quaterna?.reduce((sum, p) => sum + (p.prezzo * p.qty), 0) || 0,
      cinquina: selection.cinquina?.reduce((sum, p) => sum + (p.prezzo * p.qty), 0) || 0,
      tombola: selection.tombola?.reduce((sum, p) => sum + (p.prezzo * p.qty), 0) || 0
    };
    const totale = Object.values(costs).reduce((sum, val) => sum + val, 0);
    return {
      totale,
      scostamento: totale - budgets.budgetTotale,
      costs
    };
  };

  const launchExtraction = () => {
    const selection = generatePrizeSelection();
    setSelectedPrizes(selection);
    setShowConfirm(true);
  };

  const confirmSelection = () => {
    if (!selectedPrizes) return;

    const budgetsForExtraction = calculateBudgets();
    const costsForExtraction = calculateCosts(selectedPrizes);

    const extraction = {
      id: Date.now(),
      data: new Date().toISOString(),
      config: { ...config },
      terna: selectedPrizes.terna || [],
      quaterna: selectedPrizes.quaterna || [],
      cinquina: selectedPrizes.cinquina || [],
      tombola: selectedPrizes.tombola || [],
      // New fields requested: incasso (total receipts), biglietti (number of tickets), costo (total cost of prizes)
      incasso: budgetsForExtraction.totale,
      biglietti: config.schedeVendute,
      costo: costsForExtraction.totale,
      scostamento: costsForExtraction.scostamento
    };

    setHistory([...history, extraction]);

    // Decrement quantities
    const updatedPrizes = prizes.map(p => {
      let totalUsed = 0;
      ['terna', 'quaterna', 'cinquina', 'tombola'].forEach(cat => {
        const items = selectedPrizes[cat] || [];
        items.forEach(item => {
          if (item.id === p.id) totalUsed += item.qty;
        });
      });
      return totalUsed > 0 ? { ...p, quantita: p.quantita - totalUsed } : p;
    });
    setPrizes(updatedPrizes);

    setSelectedPrizes(null);
    setShowConfirm(false);
    setActiveTab('estrazioni');
  };

  const replacePrize = (category, itemIndex) => {
    setEditingPrize({ category, itemIndex });
  };

  const selectReplacementPrize = (prize, quantity) => {
    if (editingPrize) {
      const currentItems = [...(selectedPrizes[editingPrize.category] || [])];
      
      if (editingPrize.itemIndex !== undefined) {
        // Replace existing item
        currentItems[editingPrize.itemIndex] = { ...prize, qty: quantity };
      } else {
        // Add new item
        currentItems.push({ ...prize, qty: quantity });
      }
      
      setSelectedPrizes({
        ...selectedPrizes,
        [editingPrize.category]: currentItems
      });
      setEditingPrize(null);
      setPrizeQuantitySelector(null);
    }
  };

  const removePrizeFromSelection = (category, itemIndex) => {
    const currentItems = [...(selectedPrizes[category] || [])];
    currentItems.splice(itemIndex, 1);
    setSelectedPrizes({
      ...selectedPrizes,
      [category]: currentItems
    });
  };

  const addPrizeToCategory = (category) => {
    setEditingPrize({ category, itemIndex: undefined });
  };

  const exportToExcel = (data, filename) => {
    // If `data` looks like the extraction history, produce two sheets:
    // - `Estrazioni`: one row per extraction with incasso, biglietti, costo, scostamento
    // - `Premi`: one row per prize assigned (extractionId, categoria, descrizione, prezzo, qty, tag)
    if (Array.isArray(data) && data.length > 0 && data[0] && (data[0].terna !== undefined || data[0].tombola !== undefined)) {
      const extractions = data.map(h => {
        const totaleIncasso = h.incasso ?? (h.config ? (h.config.schedeVendute * h.config.prezzoScheda) : 0);
        const totaleCosto = h.costo ?? (['terna','quaterna','cinquina','tombola'].reduce((sum,cat) => sum + ((h[cat] || []).reduce((s,i) => s + (i.prezzo * (i.qty ?? 1)), 0)), 0));

        // Build readable detail strings per category
        const buildDetails = (cat) => (h[cat] || []).map(i => {
          const q = i.qty ?? 1;
          const p = (i.prezzo ?? 0).toFixed(2);
          const tag = i.tag ? ` [${i.tag}]` : '';
          return `${i.descrizione} x${q} (€${p})${tag}`;
        }).join(' ; ');

        return {
          id: h.id,
          data: h.data ? new Date(h.data).toLocaleString('it-IT') : '',
          incasso: totaleIncasso,
          biglietti: h.biglietti ?? (h.config ? h.config.schedeVendute : ''),
          costo: totaleCosto,
          scostamento: (h.scostamento !== undefined) ? h.scostamento : (h.scostamento ?? (h.scostamento === 0 ? 0 : (h.costo ? h.costo - (h.config ? (h.config.schedeVendute * h.config.prezzoScheda * (h.config.percEntrate/100)) : 0) : ''))),
          // keep the config fields for traceability
          percEntrate: h.config?.percEntrate ?? '',
          prezzoScheda: h.config?.prezzoScheda ?? '',
          schedeVendute: h.config?.schedeVendute ?? '',
          // Detailed prize lists per category (readable strings)
          terna_details: buildDetails('terna'),
          quaterna_details: buildDetails('quaterna'),
          cinquina_details: buildDetails('cinquina'),
          tombola_details: buildDetails('tombola')
        };
      });

      const prizeRows = [];
      data.forEach(h => {
        ['terna','quaterna','cinquina','tombola'].forEach(cat => {
          (h[cat] || []).forEach(item => {
            prizeRows.push({
              extractionId: h.id,
              data: h.data ? new Date(h.data).toLocaleString('it-IT') : '',
              categoria: cat,
              descrizione: item.descrizione ?? '',
              prezzo: item.prezzo ?? 0,
              qty: item.qty ?? 1,
              tag: item.tag ?? ''
            });
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(extractions);
      const ws2 = XLSX.utils.json_to_sheet(prizeRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Estrazioni');
      XLSX.utils.book_append_sheet(wb, ws2, 'Premi');

      // Also include the full prizes catalog (id, descrizione, prezzo, quantita, valore)
      const catalogRows = (prizes || []).map(p => ({
        id: p.id,
        descrizione: p.descrizione ?? '',
        prezzo: p.prezzo ?? 0,
        quantita: p.quantita ?? 0,
        valore: ((p.prezzo ?? 0) * (p.quantita ?? 0)),
        tag: p.tag ?? ''
      }));

      const ws3 = XLSX.utils.json_to_sheet(catalogRows);
      XLSX.utils.book_append_sheet(wb, ws3, 'Catalogo Premi');
      XLSX.writeFile(wb, filename);
      return;
    }

    // Fallback: export generic array as a single sheet (used for `prizes` export)
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
  };

  const importFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const imported = data.map(row => ({
        id: Date.now() + Math.random(),
        descrizione: row.descrizione || row.Descrizione || '',
        prezzo: parseFloat(row.prezzo || row.Prezzo || 0),
        tag: row.tag || row.Tag || '',
        quantita: parseInt(row.quantita || row.Quantita || 1)
      }));
      
      setPrizes([...prizes, ...imported]);
    };
    reader.readAsBinaryString(file);
  };

  const deleteHistory = () => {
    if (window.confirm('Sei sicuro di voler cancellare tutto lo storico? I premi verranno reintegrati.')) {
      // Reintegrate all prizes from history
      const updatedPrizes = prizes.map(p => {
        let totalUsed = 0;
        history.forEach(h => {
          ['terna', 'quaterna', 'cinquina', 'tombola'].forEach(cat => {
            const items = h[cat] || [];
            items.forEach(item => {
              if (item.id === p.id) totalUsed += item.qty;
            });
          });
        });
        return { ...p, quantita: p.quantita + totalUsed };
      });
      
      setPrizes(updatedPrizes);
      setHistory([]);
    }
  };

  const deleteSingleExtraction = (extractionId) => {
    if (window.confirm('Sei sicuro di voler cancellare questa estrazione? I premi verranno reintegrati.')) {
      const extraction = history.find(h => h.id === extractionId);
      
      // Reintegrate prizes from this extraction
      const updatedPrizes = prizes.map(p => {
        let totalUsed = 0;
        ['terna', 'quaterna', 'cinquina', 'tombola'].forEach(cat => {
          const items = extraction[cat] || [];
          items.forEach(item => {
            if (item.id === p.id) totalUsed += item.qty;
          });
        });
        return totalUsed > 0 ? { ...p, quantita: p.quantita + totalUsed } : p;
      });
      
      setPrizes(updatedPrizes);
      setHistory(history.filter(h => h.id !== extractionId));
    }
  };

  const budgets = calculateBudgets();
  const costs = calculateCosts(selectedPrizes);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-red-800">🎲 Gestionale Premi Tombola</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['premi', 'configurazione', 'estrazioni'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Premi Tab */}
        {activeTab === 'premi' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Gestione Premi</h2>
              <div className="flex gap-2">
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Upload size={20} />
                  Importa Excel
                  <input type="file" accept=".xlsx,.xls" onChange={importFromExcel} className="hidden" />
                </label>
                <button
                  onClick={() => exportToExcel(prizes, 'premi.xlsx')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download size={20} />
                  Esporta Excel
                </button>
              </div>
            </div>

            {/* Add Prize Form */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              <input
                type="text"
                placeholder="Descrizione"
                value={newPrize.descrizione}
                onChange={(e) => setNewPrize({ ...newPrize, descrizione: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Prezzo"
                value={newPrize.prezzo}
                onChange={(e) => setNewPrize({ ...newPrize, prezzo: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Tag"
                value={newPrize.tag}
                onChange={(e) => setNewPrize({ ...newPrize, tag: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Quantità"
                value={newPrize.quantita}
                onChange={(e) => setNewPrize({ ...newPrize, quantita: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={editingPrizeId ? updatePrize : addPrize}
                  className="flex-1 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  {editingPrizeId ? 'Salva' : 'Aggiungi'}
                </button>
                {editingPrizeId && (
                  <button
                    onClick={cancelEdit}
                    className="px-4 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Prizes List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Descrizione</th>
                    <th className="px-4 py-3 text-left">Prezzo</th>
                    <th className="px-4 py-3 text-left">Tag</th>
                    <th className="px-4 py-3 text-left">Quantità</th>
                    <th className="px-4 py-3 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {prizes.map(prize => (
                    <tr key={prize.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{prize.descrizione}</td>
                      <td className="px-4 py-3">€{prize.prezzo.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {prize.tag}
                        </span>
                      </td>
                      <td className="px-4 py-3">{prize.quantita}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => editPrize(prize.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deletePrize(prize.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configurazione Tab */}
        {activeTab === 'configurazione' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Configurazione Estrazione</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero Schede Vendute
                </label>
                <input
                  type="number"
                  value={config.schedeVendute}
                  onChange={(e) => setConfig({ ...config, schedeVendute: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prezzo Singola Scheda (€)
                </label>
                <input
                  type="number"
                  value={config.prezzoScheda}
                  onChange={(e) => setConfig({ ...config, prezzoScheda: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Percentuale Entrate per Premi (%)
              </label>
              <input
                type="number"
                value={config.percEntrate}
                onChange={(e) => setConfig({ ...config, percEntrate: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terna (%)</label>
                <input
                  type="number"
                  value={config.percTerna}
                  onChange={(e) => setConfig({ ...config, percTerna: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quaterna (%)</label>
                <input
                  type="number"
                  value={config.percQuaterna}
                  onChange={(e) => setConfig({ ...config, percQuaterna: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cinquina (%)</label>
                <input
                  type="number"
                  value={config.percCinquina}
                  onChange={(e) => setConfig({ ...config, percCinquina: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tombola (%)</label>
                <input
                  type="number"
                  value={config.percTombola}
                  onChange={(e) => setConfig({ ...config, percTombola: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-800 mb-2">Riepilogo Budget</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Incasso Totale:</p>
                  <p className="text-xl font-bold text-green-700">€{budgets.totale.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Budget Premi:</p>
                  <p className="text-xl font-bold text-green-700">€{budgets.budgetTotale.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Terna:</p>
                  <p className="font-semibold">€{budgets.terna.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quaterna:</p>
                  <p className="font-semibold">€{budgets.quaterna.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cinquina:</p>
                  <p className="font-semibold">€{budgets.cinquina.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tombola:</p>
                  <p className="font-semibold">€{budgets.tombola.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={launchExtraction}
              className="w-full mt-6 bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 font-bold text-lg"
            >
              Lancia Estrazione Premi
            </button>
          </div>
        )}

        {/* Estrazioni Tab */}
        {activeTab === 'estrazioni' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Storico Estrazioni</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToExcel(history, 'storico-estrazioni.xlsx')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download size={20} />
                  Esporta
                </button>
                <button
                  onClick={deleteHistory}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={20} />
                  Cancella Storico
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nessuna estrazione effettuata</p>
            ) : (
              <div className="space-y-4">
                {history.map(extraction => (
                  <div key={extraction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-sm text-gray-600">
                        {new Date(extraction.data).toLocaleString('it-IT')}
                      </p>
                      <button
                        onClick={() => deleteSingleExtraction(extraction.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                      >
                        <Trash2 size={16} />
                        Elimina
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-gray-500">Incasso</p>
                        <p className="font-bold">€{((extraction.incasso !== undefined)
                          ? extraction.incasso
                          : (extraction.config ? extraction.config.schedeVendute * extraction.config.prezzoScheda : 0)
                        ).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Biglietti</p>
                        <p className="font-bold">{extraction.biglietti ?? (extraction.config ? extraction.config.schedeVendute : '-')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Costo Premi</p>
                        <p className="font-bold text-green-700">€{((extraction.costo !== undefined)
                          ? extraction.costo
                          : (['terna','quaterna','cinquina','tombola'].reduce((sum, cat) => sum + ((extraction[cat] || []).reduce((s, i) => s + (i.prezzo * (i.qty ?? 1)), 0)), 0))
                        ).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {['terna', 'quaterna', 'cinquina', 'tombola'].map(cat => (
                        <div key={cat} className="bg-gray-50 rounded p-3">
                          <p className="font-bold text-sm capitalize mb-2">{cat}</p>
                          {(extraction[cat] || []).length > 0 ? (
                            <div className="space-y-2">
                              {extraction[cat].map((item, idx) => (
                                <div key={idx} className="text-xs border-b border-gray-200 pb-1">
                                  <p className="font-medium">{item.descrizione}</p>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">€{item.prezzo.toFixed(2)}</span>
                                    <span className="text-blue-600">x{item.qty}</span>
                                  </div>
                                  <p className="text-blue-500">{item.tag}</p>
                                </div>
                              ))}
                              <p className="font-bold text-sm text-green-700 mt-1">
                                Tot: €{extraction[cat].reduce((sum, i) => sum + i.prezzo * i.qty, 0).toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Nessun premio</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && selectedPrizes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Conferma Selezione Premi</h2>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                {['terna', 'quaterna', 'cinquina', 'tombola'].map(cat => (
                  <div key={cat} className="border border-gray-300 rounded-lg p-4">
                    <p className="font-bold capitalize mb-2">{cat}</p>
                    <p className="text-xs text-gray-500 mb-2">Budget: €{budgets[cat].toFixed(2)}</p>
                    
                    {(selectedPrizes[cat] || []).length > 0 ? (
                      <div className="space-y-2">
                        {selectedPrizes[cat].map((item, idx) => (
                          <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-medium flex-1">{item.descrizione}</p>
                              <button
                                onClick={() => removePrizeFromSelection(cat, idx)}
                                className="text-red-600 hover:text-red-800 ml-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold">€{item.prezzo.toFixed(2)} x{item.qty}</span>
                              <button
                                onClick={() => replacePrize(cat, idx)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">{item.tag}</p>
                          </div>
                        ))}
                        <p className="text-sm font-bold text-green-700">
                          Totale: €{selectedPrizes[cat].reduce((sum, i) => sum + i.prezzo * i.qty, 0).toFixed(2)}
                        </p>
                        <button
                          onClick={() => addPrizeToCategory(cat)}
                          className="w-full text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded py-1 mt-1"
                        >
                          + Aggiungi premio
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-red-500 mb-2">Nessun premio</p>
                        <button
                          onClick={() => addPrizeToCategory(cat)}
                          className="w-full text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded py-1"
                        >
                          + Aggiungi premio
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Costo Totale Premi:</p>
                    <p className="text-2xl font-bold">€{costs.totale.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Budget Totale:</p>
                    <p className="text-2xl font-bold">€{budgets.budgetTotale.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Scostamento:</p>
                    <p className={`text-2xl font-bold ${costs.scostamento > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {costs.scostamento > 0 ? '+' : ''}€{costs.scostamento.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {editingPrize && (
                <div className="mb-6 border-t pt-4">
                  <h3 className="font-bold mb-2">Seleziona premio alternativo per {editingPrize.category}:</h3>
                  {prizeQuantitySelector ? (
                    <div className="bg-gray-50 rounded p-4 border border-gray-300">
                      <div className="mb-4">
                        <p className="font-semibold text-lg">{prizeQuantitySelector.descrizione}</p>
                        <p className="text-gray-600">Prezzo: €{prizeQuantitySelector.prezzo.toFixed(2)}</p>
                        <p className="text-gray-600">Tag: {prizeQuantitySelector.tag}</p>
                        <p className="text-blue-600">Disponibili: {prizeQuantitySelector.quantita}</p>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Seleziona quantità:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: Math.min(prizeQuantitySelector.quantita, 5) }, (_, i) => i + 1).map(qty => (
                            <button
                              key={qty}
                              onClick={() => {
                                selectReplacementPrize(prizeQuantitySelector, qty);
                              }}
                              className="border border-blue-400 bg-blue-50 hover:bg-blue-100 rounded p-2 font-semibold"
                            >
                              x{qty}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setPrizeQuantitySelector(null)}
                        className="w-full text-gray-600 hover:text-gray-800 border border-gray-300 rounded py-2 mt-2"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {prizes.filter(p => p.quantita > 0).map(prize => (
                        <button
                          key={prize.id}
                          onClick={() => setPrizeQuantitySelector(prize)}
                          className="text-left border border-gray-300 rounded p-2 hover:bg-gray-50"
                        >
                          <p className="text-sm font-semibold">{prize.descrizione}</p>
                          <p className="text-xs">€{prize.prezzo.toFixed(2)} - {prize.tag}</p>
                          <p className="text-xs text-gray-500">Disponibili: {prize.quantita}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={confirmSelection}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Conferma e Salva
                </button>
                <button
                  onClick={() => setSelectedPrizes(generatePrizeSelection())}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} />
                  Ricalcola
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setSelectedPrizes(null);
                  }}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TombolaPrizeManager;