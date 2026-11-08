(function() {
  'use strict';

  const CONFIG = { ROWS: 5, COLS: 5, MAX_FARMS: 6, STORAGE_KEY: 'farmMisteris_v5_save' };

  const CROPS = {
    carrot: { name: 'Морковь', icon: '🥕', growTime: 60000, seedCost: 10, sellPrice: 25, unlockLevel: 1, xp: 5 },
    tomato: { name: 'Помидор', icon: '🍅', growTime: 120000, seedCost: 25, sellPrice: 60, unlockLevel: 2, xp: 15 },
    wheat:  { name: 'Пшеница', icon: '🌾', growTime: 180000, seedCost: 50, sellPrice: 150, unlockLevel: 3, xp: 30 },
    corn:   { name: 'Кукуруза', icon: '🌽', growTime: 300000, seedCost: 100, sellPrice: 350, unlockLevel: 4, xp: 60 },
    pumpkin:{ name: 'Тыква', icon: '🎃', growTime: 600000, seedCost: 250, sellPrice: 800, unlockLevel: 5, xp: 120 },
    golden: { name: 'Золотая', icon: '✨', growTime: 900000, seedCost: 500, sellPrice: 2000, unlockLevel: 6, xp: 250 }
  };

  const FARM_COSTS = [0, 1000, 3000, 7000, 12000, 20000];

  let state = {
    coins: 500, xp: 0, level: 1, xpToNext: 100, farms: [], currentFarmIndex: 0,
    selectedSeed: 'carrot', lastSaveTime: Date.now()
  };

  const $ = id => document.getElementById(id);

  function xpForLevel(lvl) { return Math.floor(100 * Math.pow(1.5, lvl - 1)); }
  function createEmptyGrid() { return Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(null)); }

  function initState() {
    if (!state.farms || state.farms.length === 0) {
      state.farms = [{ id: 0, grid: createEmptyGrid() }];
    }
  }

  function addXP(amount) {
    state.xp += amount;
    let leveledUp = false;
    while (state.xp >= state.xpToNext) {
      state.xp -= state.xpToNext;
      state.level++;
      state.xpToNext = xpForLevel(state.level);
      leveledUp = true;
    }
    if (leveledUp) setTimeout(() => alert(`🎉 Уровень ${state.level}! Открыты новые семена!`), 100);
  }

  function saveGame() { state.lastSaveTime = Date.now(); localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state)); }

  function loadGame() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
      try {
        state = JSON.parse(saved);
        initState();
        const timePassed = Date.now() - state.lastSaveTime;
        state.farms.forEach(farm => {
          for (let r = 0; r < CONFIG.ROWS; r++) for (let c = 0; c < CONFIG.COLS; c++) {
            const cell = farm.grid[r][c];
            if (cell && cell.status === 'growing') {
              cell.timeLeft -= timePassed;
              if (cell.timeLeft <= 0) cell.status = 'ready';
            }
          }
        });
      } catch(e) { initState(); }
    } else { initState(); }
  }

  function updateUI() {
    if ($('coinDisplay')) $('coinDisplay').textContent = state.coins;
    if ($('levelBadge')) $('levelBadge').textContent = state.level;
    if ($('xpText')) $('xpText').textContent = `${state.xp} / ${state.xpToNext} XP`;
    if ($('xpBar')) $('xpBar').style.width = Math.min(100, (state.xp / state.xpToNext) * 100) + '%';
    
    renderFarmTabs(); renderFarm(); renderShop(); renderLandList(); renderGuide();
  }

  function renderFarmTabs() {
    const container = $('farmTabs'); if (!container) return;
    container.innerHTML = '';
    state.farms.forEach((farm, index) => {
      const btn = document.createElement('button');
      btn.className = `farm-tab-btn ${index === state.currentFarmIndex ? 'active' : ''}`;
      btn.textContent = `Участок ${index + 1}`;
      btn.onclick = () => { state.currentFarmIndex = index; updateUI(); };
      container.appendChild(btn);
    });
  }

  function renderFarm() {
    const grid = $('farmGrid'); if (!grid) return;
    grid.innerHTML = '';
    const currentFarm = state.farms[state.currentFarmIndex];
    if (!currentFarm) return;

    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const cellData = currentFarm.grid[r][c];
        const cell = document.createElement('div');
        cell.className = 'farm-cell';
        
        if (cellData) {
          if (cellData.status === 'ready') { cell.classList.add('ready'); cell.textContent = CROPS[cellData.type].icon; }
          else if (cellData.status === 'growing') { cell.classList.add('growing'); cell.textContent = '🌱'; }
        } else { cell.textContent = '🟫'; }
        cell.addEventListener('click', () => handleCellClick(r, c));
        grid.appendChild(cell);
      }
    }
  }

  function handleCellClick(r, c) {
    const currentFarm = state.farms[state.currentFarmIndex];
    const cellData = currentFarm.grid[r][c];

    if (!cellData) {
      const crop = CROPS[state.selectedSeed];
      if (state.level < crop.unlockLevel) { alert('Семя заблокировано!'); return; }
      if (state.coins >= crop.seedCost) {
        state.coins -= crop.seedCost;
        currentFarm.grid[r][c] = { type: state.selectedSeed, status: 'growing', timeLeft: crop.growTime };
        startGrowthTimer(r, c, state.currentFarmIndex);
        updateUI(); saveGame();
      } else { alert('Не хватает монет!'); }
    } else if (cellData.status === 'ready') {
      const crop = CROPS[cellData.type];
      state.coins += crop.sellPrice;
      addXP(crop.xp);
      currentFarm.grid[r][c] = null;
      updateUI(); saveGame();
    }
  }

  function startGrowthTimer(r, c, farmIndex) {
    const interval = setInterval(() => {
      const cellData = state.farms[farmIndex].grid[r][c];
      if (!cellData || cellData.status !== 'growing') { clearInterval(interval); return; }
      cellData.timeLeft -= 1000;
      if (cellData.timeLeft <= 0) {
        cellData.status = 'ready'; clearInterval(interval);
        if (state.currentFarmIndex === farmIndex) updateUI();
        saveGame();
      }
    }, 1000);
  }

  function renderShop() {
    const list = $('shopList'); if (!list) return;
    list.innerHTML = '';
    const cropEntries = Object.entries(CROPS);

    for (let i = 0; i < cropEntries.length; i++) {
      const [key, crop] = cropEntries[i];
      const item = document.createElement('div');

      if (state.level < crop.unlockLevel - 1) {
        item.className = 'shop-item mystery';
        item.innerHTML = `<div class="mystery-text">???</div>`;
      } else if (state.level < crop.unlockLevel) {
        item.className = 'shop-item locked';
        item.innerHTML = `<div><div style="font-weight:800; color:var(--text-muted);">🔒 Секретное семя</div><div style="font-size:0.7rem; color:var(--text-muted);">Откроется на ${crop.unlockLevel} ур.</div></div>`;
      } else {
        item.innerHTML = `<div><div style="font-weight:800;">${crop.icon} ${crop.name}</div><div style="font-size:0.7rem; color:var(--text-muted);">Цена: ${crop.seedCost} 🪙</div></div><button class="shop-buy">Выбрать</button>`;
        item.querySelector('.shop-buy').addEventListener('click', () => { state.selectedSeed = key; alert(`Выбраны семена: ${crop.name}`); });
      }
      list.appendChild(item);
    }
  }

  function renderLandList() {
    const list = $('landList'); if (!list) return;
    list.innerHTML = '';
    for (let i = 0; i < CONFIG.MAX_FARMS; i++) {
      const isOwned = i < state.farms.length;
      const cost = FARM_COSTS[i];
      const item = document.createElement('div');
      item.className = 'shop-item';
      
      if (isOwned) {
        item.innerHTML = `<div style="font-weight:800; color:var(--accent);">🗺️ Участок ${i + 1} (Куплен)</div>`;
      } else {
        const canBuy = i === state.farms.length; 
        item.innerHTML = `<div><div style="font-weight:800;">🗺️ Участок ${i + 1}</div><div style="font-size:0.7rem; color:var(--text-muted);">Цена: ${cost} 🪙</div></div><button class="shop-buy" ${!canBuy || state.coins < cost ? 'disabled' : ''}>${!canBuy ? 'Закрыт' : 'Купить'}</button>`;
        if (canBuy) {
          item.querySelector('.shop-buy').addEventListener('click', () => {
            if (state.coins >= cost) {
              state.coins -= cost; state.farms.push({ id: i, grid: createEmptyGrid() });
              addXP(50); updateUI(); saveGame(); alert(`Участок ${i + 1} куплен!`);
            }
          });
        }
      }
      list.appendChild(item);
    }
  }

  // --- АВТОМАТИЧЕСКИЙ ГАЙД ---
  function renderGuide() {
    const list = $('guideCropsList');
    if (!list) return;
    list.innerHTML = '';

    for (const [key, crop] of Object.entries(CROPS)) {
      const item = document.createElement('div');
      item.className = 'shop-item';
      const timeInMins = crop.growTime / 60000;
      const timeText = timeInMins >= 1 ? `${timeInMins} мин.` : `${crop.growTime / 1000} сек.`;
      const profit = crop.sellPrice - crop.seedCost;
      const isLocked = state.level < crop.unlockLevel;
      if (isLocked) item.style.opacity = '0.6';

      item.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight:800; color: ${isLocked ? 'var(--text-muted)' : 'var(--text-main)'};">
            ${crop.icon} ${isLocked ? '???' : crop.name} 
            <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal;">(Ур. ${crop.unlockLevel})</span>
          </div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
            ⏳ Рост: <b>${timeText}</b> | 
            💰 Продажа: <b>${crop.sellPrice} 🪙</b> | 
            📈 Прибыль: <b style="color:#5a7a66;">+${profit} 🪙</b>
          </div>
        </div>
      `;
      list.appendChild(item);
    }
  }

  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const target = $('tab-' + btn.dataset.tab); if (target) target.classList.add('active');
      });
    });
  }

  function init() { loadGame(); updateUI(); bindTabs(); }
  document.addEventListener('DOMContentLoaded', init);
})();