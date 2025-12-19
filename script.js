const BoardSize = 8;
let boardState = []; 
let currentPlayer = 1; 
const dr = [-1, -1, -1, 0, 0, 1, 1, 1];
const dc = [-1, 0, 1, -1, 1, -1, 0, 1];

// 權重表 (進階 AI 使用)
const weightTable = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [ 10,  -2,  5, 1, 1,  5,  -2,  10],
    [  5,  -2,  1, 0, 0,  1,  -2,   5],
    [  5,  -2,  1, 0, 0,  1,  -2,   5],
    [ 10,  -2,  5, 1, 1,  5,  -2,  10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function initGame() {
    boardState = Array(BoardSize).fill().map(() => Array(BoardSize).fill(0));
    // 初始四顆棋子 [cite: 81-85]
    boardState[3][3] = 2; boardState[3][4] = 1;
    boardState[4][3] = 1; boardState[4][4] = 2;
    currentPlayer = 1;
    createUI();
    await refreshBoard();
    // 在 initGame 或按鈕綁定處增加
document.getElementById('btnRestart').onclick = async () => {
    // 增加一點點點擊後的視覺反饋
    const btn = document.getElementById('btnRestart');
    btn.style.opacity = '0.7';
    
    await initGame();
    
    setTimeout(() => {
        btn.style.opacity = '1';
    }, 200);
};
}

function createUI() {
    const panel = document.getElementById('panelBoard');
    panel.innerHTML = '';
    for (let r = 0; r < BoardSize; r++) {
        for (let c = 0; c < BoardSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            
            // 創建一個專門放數字的 span，這樣就不會影響到棋子
            const hintSpan = document.createElement('span');
            hintSpan.className = 'hint-num';
            cell.appendChild(hintSpan);

            cell.onclick = () => handlePlayerMove(r, c);
            panel.appendChild(cell);
        }
    }
}

async function handlePlayerMove(r, c) {
    if (currentPlayer !== 1 || !isValidMove(r, c, 1)) return;
    await processMove(r, c, 1);
    
    if (document.getElementById('chkComputerPlay').checked && hasAnyValidMove(2)) {
        await sleep(1200); // 玩家翻完後等一下電腦再動
        await computerMove();
    }
}

// 核心：時間差與翻轉動作
async function processMove(row, col, player) {
    // 1. 落子
    boardState[row][col] = player;
    await refreshBoard(); // 這會讓新棋子出現
    
    await sleep(500); // 讓玩家看清楚落點

    const opponent = (player === 1) ? 2 : 1;
    
    // 2. 尋找並翻轉棋子
    for (let d = 0; d < 8; d++) {
        let path = [];
        let r = row + dr[d], c = col + dc[d];
        while (r >= 0 && r < BoardSize && c >= 0 && c < BoardSize && boardState[r][c] === opponent) {
            path.push({r, c});
            r += dr[d]; c += dc[d];
        }
        
        if (path.length > 0 && r >= 0 && r < BoardSize && c >= 0 && c < BoardSize && boardState[r][c] === player) {
            for (let pos of path) {
                // 更新邏輯狀態
                boardState[pos.r][pos.c] = player;
                // 更新視覺：因為 refreshBoard 現在有檢查 isCurrentlyWhite，所以只會翻轉這一個
                await refreshBoard(); 
                await sleep(150); // 縮短翻轉間隔，效果更流暢
            }
        }
    }
    
    // 3. 結束回合
    currentPlayer = hasAnyValidMove(opponent) ? opponent : player;
    await refreshBoard(); // 最後掃描一次更新提示數字
}

// 輔助函式 [cite: 181-204, 235-257]
function isValidMove(r, c, p) {
    if (boardState[r][c] !== 0) return false;
    const opp = (p === 1) ? 2 : 1;
    for (let d = 0; d < 8; d++) {
        let nr = r + dr[d], nc = c + dc[d], found = false;
        while (nr >= 0 && nr < BoardSize && nc >= 0 && nc < BoardSize && boardState[nr][nc] === opp) {
            found = true; nr += dr[d]; nc += dc[d];
        }
        if (found && nr >= 0 && nr < BoardSize && nc >= 0 && nc < BoardSize && boardState[nr][nc] === p) return true;
    }
    return false;
}

function countFlips(r, c, p) {
    let sum = 0;
    const opp = (p === 1) ? 2 : 1;
    for (let d = 0; d < 8; d++) {
        let nr = r + dr[d], nc = c + dc[d], count = 0;
        while (nr >= 0 && nr < BoardSize && nc >= 0 && nc < BoardSize && boardState[nr][nc] === opp) {
            count++; nr += dr[d]; nc += dc[d];
        }
        if (count > 0 && nr >= 0 && nr < BoardSize && nc >= 0 && nc < BoardSize && boardState[nr][nc] === p) sum += count;
    }
    return sum;
}

function hasAnyValidMove(p) {
    for (let r = 0; r < BoardSize; r++) {
        for (let c = 0; c < BoardSize; c++) if (isValidMove(r, c, p)) return true;
    }
    return false;
}

async function computerMove() {
    const diff = document.getElementById('selDifficulty').value;
    let moves = [];
    for (let r = 0; r < BoardSize; r++) {
        for (let c = 0; c < BoardSize; c++) {
            if (isValidMove(r, c, 2)) {
                let score = (diff === 'basic') ? countFlips(r, c, 2) : countFlips(r, c, 2) + weightTable[r][c];
                moves.push({r, c, score});
            }
        }
    }
    if (moves.length === 0) { currentPlayer = 1; await refreshBoard(); return; }
    let max = Math.max(...moves.map(m => m.score));
    let best = moves.filter(m => m.score === max);
    let choice = (diff === 'basic') ? 
                 (best.find(m => (m.r==0||m.r==7)&&(m.c==0||m.c==7)) || best[0]) : 
                 best[Math.floor(Math.random()*best.length)];
    await processMove(choice.r, choice.c, 2);
}

// ... 保留前面的變數定義、weightTable 和輔助函式 ...

async function refreshBoard(isStepUpdate = false) {
    let b = 0, w = 0;
    for (let r = 0; r < BoardSize; r++) {
        for (let c = 0; c < BoardSize; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const hintSpan = cell.querySelector('.hint-num');
            const state = boardState[r][c];
            
            // 1. 更新提示數字 (不再影響 cell 的其他子元素)
            const isHint = (!isStepUpdate && state === 0 && isValidMove(r, c, currentPlayer));
            cell.classList.toggle('valid-hint', isHint);
            hintSpan.innerText = isHint ? countFlips(r, c, currentPlayer) : "";

            let container = cell.querySelector('.disc-container');

            if (state !== 0) {
                if (!container) {
                    // 2. 創建新棋子 (只在該格原本沒棋子時執行一次)
                    container = document.createElement('div');
                    container.className = 'disc-container';
                    container.innerHTML = `
                        <div class="disc-face black-face"></div>
                        <div class="disc-face white-face"></div>
                    `;
                    cell.appendChild(container);
                    
                    // 如果剛放下的是白棋，立即給予類別，不觸發動畫
                    if (state === 2) {
                        container.style.transition = 'none'; // 暫時關閉動畫
                        container.classList.add('is-white');
                        container.offsetHeight; // 強制重繪
                        container.style.transition = ''; // 恢復動畫
                    }
                } else {
                    // 3. 翻轉現有棋子 (觸發 CSS transition)
                    // 只有當狀態不一致時才 toggle，避免重複觸發動畫
                    const isCurrentlyWhite = container.classList.contains('is-white');
                    const shouldBeWhite = (state === 2);
                    if (isCurrentlyWhite !== shouldBeWhite) {
                        container.classList.toggle('is-white', shouldBeWhite);
                    }
                }
                state === 1 ? b++ : w++;
            }
        }
    }
    const scoreBlack = document.getElementById('score-black');
    const scoreWhite = document.getElementById('score-white');
    if (scoreBlack) scoreBlack.innerText = b;
    if (scoreWhite) scoreWhite.innerText = w;

    // 更新目前回合文字
    const statusLabel = document.getElementById('lblstatus');
    if (statusLabel) {
        statusLabel.innerText = currentPlayer === 1 ? '黑棋回合' : '白棋回合';
    }

    // 更新指示小圓球的顏色與動態效果
    const indicator = document.getElementById('player-indicator');
    if (indicator) {
        // 更新顏色
        indicator.classList.remove('black', 'white');
        indicator.classList.add(currentPlayer === 1 ? 'black' : 'white');
        
        // 只有在非步驟更新(真正換手)時，才執行跳動效果
        if (!isStepUpdate) {
            indicator.style.transform = 'scale(1.3)';
            setTimeout(() => indicator.style.transform = 'scale(1)', 200);
        }
    }
}

document.getElementById('btnRestart').onclick = initGame;
initGame();
