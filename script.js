/* ========================================
   GUARDIÕES DA FLORESTA - Game Engine
   ======================================== */

// ==========================================
// CONFIGURAÇÕES GLOBAIS
// ==========================================
const CONFIG = {
    GRAVITY: 0.8,
    PLAYER_SPEED: 5,
    PLAYER_JUMP: -14,
    PLAYER_WIDTH: 36,
    PLAYER_HEIGHT: 52,
    PLAYER_MAX_HEALTH: 80,
    WORLD_WIDTH: 12000,
    GROUND_Y_OFFSET: 60,
    ENEMY_SPEED: 1.5,
    INVINCIBILITY_TIME: 35,
    ATTACK_RANGE: 60,
    ATTACK_COOLDOWN: 30,
    PARTICLE_COUNT: 3,
};

// ==========================================
// ESTADO DO JOGO
// ==========================================
let canvas, ctx;
let gameState = 'menu'; // menu, playing, paused, gameover, victory
let camera = { x: 0, y: 0 };
let keys = {};
let score = 0;
let resourceCounts = { fruits: 0, herbs: 0, water: 0 };
let frameCount = 0;
let particles = [];
let backgroundLayers = [];
let platforms = [];
let collectibles = [];
let enemies = [];
let hazards = [];
let spikes = [];
let decorations = [];
let player;
let groundY;
let leafParticles = [];
let fireflies = [];
let clouds = [];
let villageX;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', e => {
        keys[e.key] = true;
        keys[e.code] = true;
        if (e.key === 'Escape' && gameState === 'playing') togglePause();
        if (e.key === 'Escape' && gameState === 'paused') resumeGame();
    });
    window.addEventListener('keyup', e => {
        keys[e.key] = false;
        keys[e.code] = false;
    });
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) { // Botão esquerdo do mouse
            keys['mouseAttack'] = true;
        }
    });
    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) {
            keys['mouseAttack'] = false;
        }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    generateClouds();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height - CONFIG.GROUND_Y_OFFSET;
}

// ==========================================
// GERAÇÃO DO MUNDO
// ==========================================
function generateWorld() {
    platforms = [];
    collectibles = [];
    enemies = [];
    hazards = [];
    spikes = [];
    decorations = [];
    particles = [];
    leafParticles = [];
    fireflies = [];
    score = 0;
    resourceCounts = { fruits: 0, herbs: 0, water: 0 };
    frameCount = 0;
    camera = { x: 0, y: 0 };

    villageX = CONFIG.WORLD_WIDTH - 400;

    // Gerar Plataformas
    let px = 350;
    while (px < CONFIG.WORLD_WIDTH - 600) {
        const pw = 100 + Math.random() * 200;
        const py = groundY - 80 - Math.random() * 200;
        platforms.push(new Platform(px, py, pw, 20));
        
        // Adicionar coletáveis nas plataformas
        if (Math.random() < 0.7) {
            const types = ['fruit', 'herb', 'water'];
            const type = types[Math.floor(Math.random() * types.length)];
            collectibles.push(new Collectible(px + pw / 2, py - 30, type));
        }

        px += pw + 80 + Math.random() * 150;
    }

    // Coletáveis no chão
    for (let i = 200; i < CONFIG.WORLD_WIDTH - 500; i += 200 + Math.random() * 300) {
        if (Math.random() < 0.4) {
            const types = ['fruit', 'herb', 'water'];
            const type = types[Math.floor(Math.random() * types.length)];
            collectibles.push(new Collectible(i, groundY - 25, type));
        }
    }

    // Inimigos terrestres (MUITO MAIS - a cada 200-350px)
    const enemyPositions = [];
    for (let i = 400; i < CONFIG.WORLD_WIDTH - 800; i += 200 + Math.random() * 150) {
        if (Math.random() < 0.75) {
            const type = Math.random() < 0.5 ? 'jaguar' : 'snake';
            const range = 60 + Math.random() * 60;
            enemies.push(new Enemy(i, groundY, type, range));
            enemyPositions.push(i);
        }
    }

    // Inimigos voadores (pássaros agressivos - MAIS FREQUENTES)
    for (let i = 600; i < CONFIG.WORLD_WIDTH - 800; i += 300 + Math.random() * 300) {
        if (Math.random() < 0.5) {
            enemies.push(new Enemy(i, groundY - 150 - Math.random() * 100, 'hawk', 80));
        }
    }

    // Zonas de desmatamento (perigo - MAIS FREQUENTES)
    for (let i = 700; i < CONFIG.WORLD_WIDTH - 1000; i += 400 + Math.random() * 300) {
        if (Math.random() < 0.65) {
            const hw = 60 + Math.random() * 50;
            hazards.push(new Hazard(i, groundY, hw));
        }
    }

    // Espinhos no chão
    for (let i = 500; i < CONFIG.WORLD_WIDTH - 800; i += 250 + Math.random() * 200) {
        if (Math.random() < 0.6) {
            const sw = 30 + Math.random() * 20;
            spikes.push(new Spike(i, groundY, sw));
        }
    }

    // Espinhos nas plataformas
    for (const plat of platforms) {
        if (Math.random() < 0.35) {
            const sw = 15 + Math.random() * 15;
            const sx = plat.x + Math.random() * (plat.w - sw);
            spikes.push(new Spike(sx, plat.y, sw));
        }
    }

    // Decorações (árvores, arbustos, flores)
    for (let i = 50; i < CONFIG.WORLD_WIDTH; i += 60 + Math.random() * 120) {
        const type = Math.random();
        if (type < 0.35) {
            decorations.push({ type: 'tree', x: i, scale: 0.7 + Math.random() * 0.6 });
        } else if (type < 0.6) {
            decorations.push({ type: 'bush', x: i, scale: 0.5 + Math.random() * 0.5 });
        } else if (type < 0.75) {
            decorations.push({ type: 'flower', x: i, color: `hsl(${Math.random() * 360}, 70%, 60%)` });
        } else if (type < 0.85) {
            decorations.push({ type: 'mushroom', x: i, scale: 0.5 + Math.random() * 0.5 });
        }
    }

    // Gerar folhas caindo
    for (let i = 0; i < 40; i++) {
        leafParticles.push(new LeafParticle());
    }

    // Gerar vagalumes
    for (let i = 0; i < 25; i++) {
        fireflies.push(new Firefly());
    }

    // Jogador
    player = new Player(100, groundY - CONFIG.PLAYER_HEIGHT);
}

function generateClouds() {
    clouds = [];
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * CONFIG.WORLD_WIDTH,
            y: 20 + Math.random() * 80,
            w: 80 + Math.random() * 120,
            h: 30 + Math.random() * 30,
            speed: 0.1 + Math.random() * 0.3,
            opacity: 0.05 + Math.random() * 0.1,
        });
    }
}

// ==========================================
// CLASSES DO JOGO
// ==========================================

// --- JOGADOR ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = CONFIG.PLAYER_WIDTH;
        this.h = CONFIG.PLAYER_HEIGHT;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.invincible = 0;
        this.facing = 1; // 1 = right, -1 = left
        this.animFrame = 0;
        this.animTimer = 0;
        this.isRunning = false;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.dead = false;
        this.walkCycle = 0;
        this.jumpReleased = true; // Impede pulo contínuo segurando tecla
    }

    update() {
        if (this.dead) return;

        // Input
        this.isRunning = false;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.vx = -CONFIG.PLAYER_SPEED;
            this.facing = -1;
            this.isRunning = true;
        } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.vx = CONFIG.PLAYER_SPEED;
            this.facing = 1;
            this.isRunning = true;
        } else {
            this.vx *= 0.7;
        }

        const jumpPressed = keys['ArrowUp'] || keys[' '] || keys['w'] || keys['W'] || keys['Space'];
        if (jumpPressed && this.onGround && this.jumpReleased) {
            this.vy = CONFIG.PLAYER_JUMP;
            this.onGround = false;
            this.jumpReleased = false;
            spawnParticles(this.x + this.w / 2, this.y + this.h, 5, '#8B7355', 'jump');
        }
        if (!jumpPressed) {
            this.jumpReleased = true;
        }

        // Ataque (X ou clique esquerdo do mouse)
        if ((keys['x'] || keys['X'] || keys['mouseAttack']) && this.attackCooldown <= 0 && !this.isAttacking) {
            this.isAttacking = true;
            this.attackTimer = 15;
            this.attackCooldown = CONFIG.ATTACK_COOLDOWN;
            this.performAttack();
        }

        if (this.attackTimer > 0) this.attackTimer--;
        else this.isAttacking = false;
        if (this.attackCooldown > 0) this.attackCooldown--;

        // Física
        this.vy += CONFIG.GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Limites
        if (this.x < 0) this.x = 0;
        if (this.x > CONFIG.WORLD_WIDTH - this.w) this.x = CONFIG.WORLD_WIDTH - this.w;

        // Chão
        this.onGround = false;
        if (this.y + this.h >= groundY) {
            this.y = groundY - this.h;
            this.vy = 0;
            this.onGround = true;
        }

        // Plataformas
        for (const plat of platforms) {
            if (this.vy >= 0 &&
                this.x + this.w > plat.x && this.x < plat.x + plat.w &&
                this.y + this.h >= plat.y && this.y + this.h <= plat.y + plat.h + 10) {
                this.y = plat.y - this.h;
                this.vy = 0;
                this.onGround = true;
            }
        }

        // Invencibilidade
        if (this.invincible > 0) this.invincible--;

        // Animação
        if (this.isRunning && this.onGround) {
            this.walkCycle += 0.2;
        }

        // Partículas de corrida
        if (this.isRunning && this.onGround && frameCount % 6 === 0) {
            spawnParticles(this.x + this.w / 2, this.y + this.h, 2, '#8B7355', 'dust');
        }

        // Colisão com coletáveis
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const c = collectibles[i];
            if (!c.collected && this.collidesWith(c)) {
                c.collected = true;
                score += c.points;
                resourceCounts[c.resourceType]++;
                spawnParticles(c.x, c.y, 8, c.color, 'collect');
                updateHUD();
            }
        }

        // Colisão com inimigos
        for (const enemy of enemies) {
            if (!enemy.dead && this.invincible <= 0 && this.collidesWith(enemy)) {
                this.takeDamage(enemy.damage);
            }
        }

        // Colisão com zonas de desmatamento
        for (const h of hazards) {
            if (this.invincible <= 0 && this.collidesWithHazard(h)) {
                this.takeDamage(1.5);
            }
        }

        // Colisão com espinhos
        for (const s of spikes) {
            if (this.invincible <= 0 && this.collidesWithSpike(s)) {
                this.takeDamage(15);
                this.vy = -8; // Empurra para cima ao pisar nos espinhos
                spawnParticles(this.x + this.w / 2, this.y + this.h, 6, '#e74c3c', 'hit');
            }
        }

        // Verificar vitória
        if (this.x >= villageX) {
            victory();
        }
    }

    performAttack() {
        const attackX = this.facing === 1 ? this.x + this.w : this.x - CONFIG.ATTACK_RANGE;
        for (const enemy of enemies) {
            if (!enemy.dead) {
                const ex = enemy.x;
                const ey = enemy.y - enemy.h;
                if (attackX < ex + enemy.w && attackX + CONFIG.ATTACK_RANGE > ex &&
                    this.y < ey + enemy.h && this.y + this.h > ey) {
                    enemy.takeDamage(40);
                    spawnParticles(enemy.x + enemy.w / 2, enemy.y - enemy.h / 2, 6, '#ff6b35', 'hit');
                }
            }
        }
        // Efeito visual do ataque
        spawnParticles(
            this.x + this.w / 2 + this.facing * 30,
            this.y + this.h / 2,
            4, '#ffffaa', 'slash'
        );
    }

    takeDamage(amount) {
        if (this.invincible > 0) return;
        this.health -= amount;
        this.invincible = CONFIG.INVINCIBILITY_TIME;
        spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 6, '#e74c3c', 'hit');
        updateHUD();
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            gameOver();
        }
    }

    collidesWith(obj) {
        return this.x < obj.x + (obj.w || 20) &&
               this.x + this.w > obj.x &&
               this.y < obj.y + (obj.h || 20) &&
               this.y + this.h > obj.y;
    }

    collidesWithHazard(h) {
        return this.x + this.w > h.x && this.x < h.x + h.w &&
               this.y + this.h > h.y - 10;
    }

    collidesWithSpike(s) {
        return this.x + this.w > s.x && this.x < s.x + s.w &&
               this.y + this.h > s.y - s.spikeH && this.y < s.y;
    }

    draw() {
        if (this.dead) return;
        if (this.invincible > 0 && this.invincible % 4 < 2) return; // Piscar

        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.translate(sx + this.w / 2, sy + this.h / 2);
        ctx.scale(this.facing, 1);
        ctx.translate(-this.w / 2, -this.h / 2);

        const bounce = this.isRunning && this.onGround ? Math.sin(this.walkCycle) * 3 : 0;
        const legAngle = this.isRunning && this.onGround ? Math.sin(this.walkCycle) * 0.5 : 0;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.w / 2, this.h + 2, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- Desenhar personagem indígena ---
        
        // Pernas
        ctx.save();
        ctx.translate(this.w / 2 - 6, this.h - 18);
        ctx.rotate(legAngle);
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(-3, 0, 7, 18);
        // Pé
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(-3, 15, 9, 4);
        ctx.restore();

        ctx.save();
        ctx.translate(this.w / 2 + 6, this.h - 18);
        ctx.rotate(-legAngle);
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(-4, 0, 7, 18);
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(-4, 15, 9, 4);
        ctx.restore();

        // Corpo
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(this.w / 2 - 10, bounce + 8, 20, 26);

        // Roupa/Saia tribal
        ctx.fillStyle = '#CC6B30';
        ctx.fillRect(this.w / 2 - 12, bounce + 26, 24, 10);
        // Padrão na roupa
        ctx.fillStyle = '#E8A838';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(this.w / 2 - 10 + i * 6, bounce + 28, 3, 2);
        }
        // Padrão triangular
        ctx.fillStyle = '#A0522D';
        ctx.beginPath();
        ctx.moveTo(this.w / 2 - 8, bounce + 32);
        ctx.lineTo(this.w / 2 - 5, bounce + 27);
        ctx.lineTo(this.w / 2 - 2, bounce + 32);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.w / 2 + 2, bounce + 32);
        ctx.lineTo(this.w / 2 + 5, bounce + 27);
        ctx.lineTo(this.w / 2 + 8, bounce + 32);
        ctx.fill();

        // Colar tribal
        ctx.strokeStyle = '#E8A838';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.w / 2, bounce + 12, 8, 0.2, Math.PI - 0.2);
        ctx.stroke();
        // Pendente do colar
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(this.w / 2, bounce + 20, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pintura corporal - linhas no peito
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.w / 2 - 7, bounce + 14);
        ctx.lineTo(this.w / 2 - 3, bounce + 18);
        ctx.moveTo(this.w / 2 + 7, bounce + 14);
        ctx.lineTo(this.w / 2 + 3, bounce + 18);
        ctx.stroke();

        // Braços
        const armAngle = this.isAttacking ? -1.2 : (this.isRunning ? Math.sin(this.walkCycle) * 0.6 : 0);
        // Braço traseiro
        ctx.save();
        ctx.translate(this.w / 2 - 10, bounce + 12);
        ctx.rotate(-armAngle);
        ctx.fillStyle = '#7A5230';
        ctx.fillRect(-3, 0, 6, 18);
        // Bracelete
        ctx.fillStyle = '#E8A838';
        ctx.fillRect(-4, 12, 8, 3);
        ctx.restore();

        // Braço frontal
        ctx.save();
        ctx.translate(this.w / 2 + 10, bounce + 12);
        ctx.rotate(armAngle);
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(-3, 0, 6, 18);
        // Bracelete
        ctx.fillStyle = '#E8A838';
        ctx.fillRect(-4, 12, 8, 3);
        // Arco/arma se atacando
        if (this.isAttacking) {
            ctx.fillStyle = '#5D3A1A';
            ctx.fillRect(2, -8, 3, 30);
            // Lâmina
            ctx.fillStyle = '#A8A8A8';
            ctx.beginPath();
            ctx.moveTo(3, -8);
            ctx.lineTo(8, -14);
            ctx.lineTo(3, -4);
            ctx.fill();
        }
        ctx.restore();

        // Cabeça
        ctx.fillStyle = '#8B5E3C';
        ctx.beginPath();
        ctx.ellipse(this.w / 2, bounce + 5, 10, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cabelo
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(this.w / 2, bounce + 0, 11, 8, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Cabelo longo atrás
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.w / 2 - 11, bounce - 2, 3, 18);
        ctx.fillRect(this.w / 2 + 8, bounce - 2, 3, 18);

        // Cocar (penas)
        const featherColors = ['#e74c3c', '#f39c12', '#2ecc71', '#e74c3c', '#3498db'];
        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.translate(this.w / 2 - 2 + i * 2, bounce - 6);
            ctx.rotate(-0.4 + i * 0.2 + Math.sin(frameCount * 0.05 + i) * 0.05);
            ctx.fillStyle = featherColors[i];
            ctx.beginPath();
            ctx.ellipse(0, -10, 2.5, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            // Detalhe da pena
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(0, -14, 1.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Pintura facial
        ctx.fillStyle = '#e74c3c';
        // Faixas no rosto
        ctx.fillRect(this.w / 2 - 8, bounce + 3, 5, 2);
        ctx.fillRect(this.w / 2 + 3, bounce + 3, 5, 2);
        // Segunda faixa
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.w / 2 - 7, bounce + 7, 4, 1.5);
        ctx.fillRect(this.w / 2 + 3, bounce + 7, 4, 1.5);

        // Olhos
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.w / 2 - 6, bounce + 2, 5, 4);
        ctx.fillRect(this.w / 2 + 1, bounce + 2, 5, 4);
        // Pupilas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.w / 2 - 4 + (this.facing > 0 ? 1 : -1), bounce + 3, 2.5, 2.5);
        ctx.fillRect(this.w / 2 + 2 + (this.facing > 0 ? 1 : -1), bounce + 3, 2.5, 2.5);

        // Efeito de ataque
        if (this.isAttacking && this.attackTimer > 8) {
            ctx.strokeStyle = 'rgba(255, 255, 150, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.w + 10, this.h / 2, 20 - this.attackTimer, 
                -0.5, 0.5);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// --- PLATAFORMA ---
class Platform {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.grassDetails = [];
        // Gerar detalhes de grama
        for (let i = 0; i < w; i += 6 + Math.random() * 4) {
            this.grassDetails.push({
                x: i,
                h: 4 + Math.random() * 6,
                lean: (Math.random() - 0.5) * 0.3
            });
        }
    }

    draw() {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx + this.w < -50 || sx > canvas.width + 50) return;

        // Sombra da plataforma
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(sx + 3, sy + 3, this.w, this.h + 8);

        // Corpo da plataforma (terra)
        const gradient = ctx.createLinearGradient(sx, sy, sx, sy + this.h + 8);
        gradient.addColorStop(0, '#5a3a1a');
        gradient.addColorStop(0.3, '#4a2f15');
        gradient.addColorStop(1, '#3a2510');
        ctx.fillStyle = gradient;

        // Cantos arredondados
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(sx + r, sy);
        ctx.lineTo(sx + this.w - r, sy);
        ctx.quadraticCurveTo(sx + this.w, sy, sx + this.w, sy + r);
        ctx.lineTo(sx + this.w, sy + this.h + 8);
        ctx.lineTo(sx, sy + this.h + 8);
        ctx.lineTo(sx, sy + r);
        ctx.quadraticCurveTo(sx, sy, sx + r, sy);
        ctx.fill();

        // Camada de grama no topo
        const grassGrad = ctx.createLinearGradient(sx, sy - 3, sx, sy + 5);
        grassGrad.addColorStop(0, '#4CAF50');
        grassGrad.addColorStop(1, '#2E7D32');
        ctx.fillStyle = grassGrad;
        ctx.beginPath();
        ctx.moveTo(sx - 2, sy + 5);
        ctx.lineTo(sx - 2, sy);
        ctx.quadraticCurveTo(sx + this.w / 2, sy - 4, sx + this.w + 2, sy);
        ctx.lineTo(sx + this.w + 2, sy + 5);
        ctx.fill();

        // Grama individual
        for (const g of this.grassDetails) {
            ctx.save();
            ctx.translate(sx + g.x, sy - 2);
            ctx.rotate(g.lean + Math.sin(frameCount * 0.03 + g.x) * 0.05);
            ctx.fillStyle = `hsl(${120 + Math.random() * 20}, 60%, ${35 + Math.random() * 15}%)`;
            ctx.fillRect(-1, -g.h, 2, g.h);
            ctx.restore();
        }

        // Textura de terra
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 3; i++) {
            const tx = sx + 10 + (i * this.w / 3);
            const ty = sy + 8 + i * 3;
            ctx.fillRect(tx, ty, 6 + i * 2, 2);
        }
    }
}

// --- COLETÁVEL ---
class Collectible {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.w = 22;
        this.h = 22;
        this.type = type;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotation = 0;

        switch (type) {
            case 'fruit':
                this.color = '#e74c3c';
                this.points = 10;
                this.resourceType = 'fruits';
                this.emoji = '🍎';
                break;
            case 'herb':
                this.color = '#2ecc71';
                this.points = 15;
                this.resourceType = 'herbs';
                this.emoji = '🌿';
                break;
            case 'water':
                this.color = '#3498db';
                this.points = 20;
                this.resourceType = 'water';
                this.emoji = '💧';
                break;
        }
    }

    update() {
        this.rotation += 0.02;
    }

    draw() {
        if (this.collected) return;
        const bobY = Math.sin(frameCount * 0.04 + this.bobOffset) * 5;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y + bobY;
        if (sx < -30 || sx > canvas.width + 30) return;

        // Brilho
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.6 + Math.sin(frameCount * 0.06 + this.bobOffset) * 0.2;

        // Círculo de brilho
        const glowGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
        glowGrad.addColorStop(0, this.color + '40');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Desenhar item
        if (this.type === 'fruit') {
            // Maçã
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(sx, sy + 2, 9, 0, Math.PI * 2);
            ctx.fill();
            // Brilho
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 1, 3, 0, Math.PI * 2);
            ctx.fill();
            // Folha
            ctx.fillStyle = '#27ae60';
            ctx.beginPath();
            ctx.ellipse(sx + 2, sy - 8, 4, 2, 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Talo
            ctx.strokeStyle = '#5D3A1A';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy - 3);
            ctx.lineTo(sx + 1, sy - 8);
            ctx.stroke();
        } else if (this.type === 'herb') {
            // Erva medicinal
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy + 8);
            ctx.lineTo(sx, sy - 4);
            ctx.stroke();
            // Folhas
            const leaves = [[-5, -2, -0.4], [5, -4, 0.4], [-4, -7, -0.3]];
            for (const [lx, ly, lr] of leaves) {
                ctx.save();
                ctx.translate(sx + lx * 0.5, sy + ly);
                ctx.rotate(lr);
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.ellipse(lx * 0.5, 0, 5, 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Brilho central
            ctx.fillStyle = '#a8ffaa';
            ctx.beginPath();
            ctx.arc(sx, sy - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'water') {
            // Gota de água
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.moveTo(sx, sy - 10);
            ctx.quadraticCurveTo(sx + 10, sy, sx + 6, sy + 6);
            ctx.quadraticCurveTo(sx, sy + 10, sx - 6, sy + 6);
            ctx.quadraticCurveTo(sx - 10, sy, sx, sy - 10);
            ctx.fill();
            // Reflexo
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.ellipse(sx - 2, sy - 2, 2, 4, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sparkles
        if (frameCount % 20 < 10) {
            ctx.fillStyle = '#fff';
            const sparkX = sx + Math.sin(frameCount * 0.1) * 12;
            const sparkY = sy + Math.cos(frameCount * 0.1) * 8;
            ctx.fillRect(sparkX - 1, sparkY - 1, 2, 2);
        }

        ctx.restore();
    }
}

// --- INIMIGO ---
class Enemy {
    constructor(x, y, type, range) {
        this.originX = x;
        this.x = x;
        this.y = y;
        this.type = type;
        this.range = range;
        this.direction = 1;
        this.dead = false;
        this.health = type === 'jaguar' ? 60 : type === 'hawk' ? 40 : 30;
        this.maxHealth = this.health;
        this.animFrame = 0;
        this.damage = type === 'jaguar' ? 30 : type === 'hawk' ? 25 : 15;

        switch (type) {
            case 'jaguar':
                this.w = 50;
                this.h = 35;
                this.speed = 1.8;
                break;
            case 'snake':
                this.w = 40;
                this.h = 15;
                this.speed = 1;
                break;
            case 'hawk':
                this.w = 40;
                this.h = 25;
                this.speed = 2;
                this.baseY = y;
                break;
        }
    }

    update() {
        if (this.dead) return;
        this.animFrame += 0.08;

        if (this.type === 'hawk') {
            this.x += this.speed * this.direction;
            this.y = this.baseY + Math.sin(frameCount * 0.04) * 30;
        } else {
            this.x += this.speed * this.direction;
        }

        if (this.x > this.originX + this.range) this.direction = -1;
        if (this.x < this.originX - this.range) this.direction = 1;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.dead = true;
            score += 25;
            spawnParticles(this.x + this.w / 2, this.y - this.h / 2, 10, '#ff6b35', 'death');
            updateHUD();
        }
    }

    draw() {
        if (this.dead) return;
        const sx = this.x - camera.x;
        const sy = (this.type === 'hawk' ? this.y : this.y - this.h) - camera.y;
        if (sx + this.w < -50 || sx > canvas.width + 50) return;

        ctx.save();

        if (this.type === 'jaguar') {
            this.drawJaguar(sx, sy);
        } else if (this.type === 'snake') {
            this.drawSnake(sx, sy);
        } else if (this.type === 'hawk') {
            this.drawHawk(sx, sy);
        }

        // Barra de vida
        if (this.health < this.maxHealth) {
            const barW = this.w;
            const barH = 4;
            const barX = sx;
            const barY = sy - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = this.health > this.maxHealth * 0.3 ? '#e74c3c' : '#ff0000';
            ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), barH);
        }

        ctx.restore();
    }

    drawJaguar(sx, sy) {
        const walk = Math.sin(this.animFrame * 3) * 2;
        ctx.save();
        ctx.translate(sx + this.w / 2, sy + this.h / 2);
        ctx.scale(this.direction, 1);
        ctx.translate(-this.w / 2, -this.h / 2);

        // Corpo
        ctx.fillStyle = '#D4A836';
        ctx.beginPath();
        ctx.ellipse(this.w / 2, this.h / 2 + walk, 22, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Manchas
        ctx.fillStyle = '#8B6914';
        const spots = [[8, 8], [20, 5], [30, 10], [15, 18], [25, 20], [35, 15]];
        for (const [spx, spy] of spots) {
            ctx.beginPath();
            ctx.arc(spx, spy + walk, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pernas
        const legAnim = Math.sin(this.animFrame * 3);
        ctx.fillStyle = '#C4982E';
        ctx.fillRect(6, this.h - 4 + walk, 5, 8 + legAnim * 2);
        ctx.fillRect(15, this.h - 4 + walk, 5, 8 - legAnim * 2);
        ctx.fillRect(30, this.h - 4 + walk, 5, 8 - legAnim * 2);
        ctx.fillRect(38, this.h - 4 + walk, 5, 8 + legAnim * 2);

        // Cabeça
        ctx.fillStyle = '#D4A836';
        ctx.beginPath();
        ctx.ellipse(this.w - 2, this.h / 2 - 2 + walk, 10, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Orelhas
        ctx.fillStyle = '#BF8C20';
        ctx.beginPath();
        ctx.arc(this.w + 2, this.h / 2 - 10 + walk, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.w - 6, this.h / 2 - 10 + walk, 4, 0, Math.PI * 2);
        ctx.fill();

        // Olhos
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.w - 1, this.h / 2 - 5 + walk, 4, 3);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.w, this.h / 2 - 4 + walk, 2, 2);

        // Focinho
        ctx.fillStyle = '#8B5E3C';
        ctx.beginPath();
        ctx.ellipse(this.w + 6, this.h / 2 + walk, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cauda
        ctx.strokeStyle = '#D4A836';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(2, this.h / 2 + walk);
        ctx.quadraticCurveTo(-8, this.h / 2 - 10 + walk, -5, this.h / 2 - 18 + Math.sin(this.animFrame * 2) * 5);
        ctx.stroke();

        ctx.restore();
    }

    drawSnake(sx, sy) {
        ctx.save();
        ctx.translate(sx, sy);

        // Corpo da cobra (ondulante)
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, this.h / 2);
        for (let i = 0; i < this.w; i += 2) {
            ctx.lineTo(i, this.h / 2 + Math.sin(i * 0.15 + this.animFrame * 3) * 5);
        }
        ctx.stroke();

        // Barriga
        ctx.strokeStyle = '#81C784';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(2, this.h / 2);
        for (let i = 2; i < this.w - 2; i += 2) {
            ctx.lineTo(i, this.h / 2 + Math.sin(i * 0.15 + this.animFrame * 3) * 5);
        }
        ctx.stroke();

        // Cabeça
        const headX = this.direction > 0 ? this.w : 0;
        const headY = this.h / 2 + Math.sin((this.direction > 0 ? this.w : 0) * 0.15 + this.animFrame * 3) * 5;
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.ellipse(headX, headY, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Olho
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(headX + this.direction * 3, headY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(headX + this.direction * 3, headY - 2, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Língua
        if (Math.sin(this.animFrame * 4) > 0) {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(headX + this.direction * 6, headY + 1);
            ctx.lineTo(headX + this.direction * 12, headY - 2);
            ctx.moveTo(headX + this.direction * 10, headY);
            ctx.lineTo(headX + this.direction * 12, headY + 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawHawk(sx, sy) {
        ctx.save();
        ctx.translate(sx + this.w / 2, sy + this.h / 2);
        ctx.scale(this.direction, 1);

        const wingFlap = Math.sin(this.animFrame * 4) * 0.6;

        // Corpo
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Asas
        ctx.save();
        ctx.rotate(wingFlap);
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.ellipse(-5, -8, 18, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Penas
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.ellipse(-5, -8, 14, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.rotate(-wingFlap);
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.ellipse(-5, 8, 18, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.ellipse(-5, 8, 14, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Cabeça
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(12, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Olho
        ctx.fillStyle = '#FFD600';
        ctx.beginPath();
        ctx.arc(14, -1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(14.5, -1, 1, 0, Math.PI * 2);
        ctx.fill();

        // Bico
        ctx.fillStyle = '#FF8F00';
        ctx.beginPath();
        ctx.moveTo(17, -1);
        ctx.lineTo(22, 1);
        ctx.lineTo(17, 2);
        ctx.fill();

        // Cauda
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.moveTo(-14, -3);
        ctx.lineTo(-22, -5);
        ctx.lineTo(-22, 5);
        ctx.lineTo(-14, 3);
        ctx.fill();

        ctx.restore();
    }
}

// --- ZONA DE DESMATAMENTO ---
class Hazard {
    constructor(x, y, w) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.stumps = [];
        for (let i = 0; i < w / 30; i++) {
            this.stumps.push({
                x: 10 + i * 30 + Math.random() * 10,
                w: 12 + Math.random() * 8,
                h: 8 + Math.random() * 10
            });
        }
    }

    draw() {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx + this.w < -50 || sx > canvas.width + 50) return;

        // Chão destruído
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(sx - 5, sy - 5, this.w + 10, 10);

        // Terra seca e rachada
        ctx.fillStyle = '#795548';
        ctx.fillRect(sx, sy - 3, this.w, 6);
        // Rachaduras
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.w; i += 15) {
            ctx.beginPath();
            ctx.moveTo(sx + i, sy - 3);
            ctx.lineTo(sx + i + 5, sy + 3);
            ctx.stroke();
        }

        // Tocos de árvore
        for (const stump of this.stumps) {
            ctx.fillStyle = '#6D4C41';
            ctx.fillRect(sx + stump.x - stump.w / 2, sy - stump.h, stump.w, stump.h);
            // Anéis do tronco
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(sx + stump.x, sy - stump.h, stump.w / 2, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#8D6E63';
            ctx.beginPath();
            ctx.ellipse(sx + stump.x, sy - stump.h, stump.w / 2, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ícone de perigo
        if (Math.sin(frameCount * 0.08) > 0) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 16px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️', sx + this.w / 2, sy - 25);
        }

        // Fumaça
        ctx.fillStyle = 'rgba(100, 100, 100, 0.15)';
        for (let i = 0; i < 3; i++) {
            const smokeY = sy - 20 - Math.sin(frameCount * 0.02 + i) * 15 - i * 10;
            const smokeR = 8 + i * 4;
            ctx.beginPath();
            ctx.arc(sx + this.w / 2 + Math.sin(frameCount * 0.03 + i * 2) * 10, smokeY, smokeR, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// --- ESPINHOS (NOVO OBSTÁCULO) ---
class Spike {
    constructor(x, y, w) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.spikeH = 18;
        this.spikeCount = Math.floor(w / 14);
    }

    draw() {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx + this.w < -50 || sx > canvas.width + 50) return;

        // Base dos espinhos
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(sx - 2, sy - 4, this.w + 4, 6);

        // Espinhos individuais
        const spikeW = this.w / this.spikeCount;
        for (let i = 0; i < this.spikeCount; i++) {
            const spX = sx + i * spikeW + spikeW / 2;
            const pulse = Math.sin(frameCount * 0.05 + i) * 1;

            // Espinho (triângulo)
            ctx.fillStyle = '#8B8B8B';
            ctx.beginPath();
            ctx.moveTo(spX - spikeW / 2 + 2, sy - 3);
            ctx.lineTo(spX, sy - this.spikeH - pulse);
            ctx.lineTo(spX + spikeW / 2 - 2, sy - 3);
            ctx.fill();

            // Brilho na ponta
            ctx.fillStyle = '#C0C0C0';
            ctx.beginPath();
            ctx.moveTo(spX - 1, sy - this.spikeH + 3 - pulse);
            ctx.lineTo(spX, sy - this.spikeH - pulse);
            ctx.lineTo(spX + 1, sy - this.spikeH + 3 - pulse);
            ctx.fill();

            // Mancha de sangue (decorativa)
            if (i % 3 === 0) {
                ctx.fillStyle = 'rgba(180, 40, 40, 0.4)';
                ctx.beginPath();
                ctx.arc(spX, sy - 8, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Brilho de perigo pulsante
        const glowAlpha = 0.1 + Math.sin(frameCount * 0.06) * 0.05;
        ctx.fillStyle = `rgba(231, 76, 60, ${glowAlpha})`;
        ctx.fillRect(sx - 4, sy - this.spikeH - 5, this.w + 8, this.spikeH + 10);
    }
}

// --- PARTÍCULA DE FOLHAS ---
class LeafParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * CONFIG.WORLD_WIDTH;
        this.y = -10 - Math.random() * 100;
        this.size = 3 + Math.random() * 4;
        this.speedY = 0.3 + Math.random() * 0.7;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.04;
        this.color = `hsl(${100 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${30 + Math.random() * 25}%)`;
        this.swayFreq = 0.01 + Math.random() * 0.02;
        this.swayAmp = 20 + Math.random() * 30;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(frameCount * this.swayFreq) * 0.3;
        this.rotation += this.rotSpeed;
        if (this.y > groundY) this.reset();
    }

    draw() {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx < -20 || sx > canvas.width + 20) return;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- VAGALUME ---
class Firefly {
    constructor() {
        this.x = Math.random() * CONFIG.WORLD_WIDTH;
        this.y = groundY - 50 - Math.random() * 200;
        this.baseX = this.x;
        this.baseY = this.y;
        this.phase = Math.random() * Math.PI * 2;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.radius = 30 + Math.random() * 50;
    }

    update() {
        this.x = this.baseX + Math.sin(frameCount * 0.01 + this.phase) * this.radius;
        this.y = this.baseY + Math.cos(frameCount * 0.015 + this.phase) * (this.radius * 0.5);
    }

    draw() {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (sx < -30 || sx > canvas.width + 30) return;

        const glow = 0.3 + Math.sin(frameCount * 0.06 + this.glowPhase) * 0.4;
        if (glow < 0.1) return;

        ctx.save();
        ctx.globalAlpha = glow;

        // Brilho externo
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
        grad.addColorStop(0, 'rgba(200, 255, 100, 0.6)');
        grad.addColorStop(0.5, 'rgba(180, 255, 80, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.fill();

        // Centro
        ctx.fillStyle = '#e8ff6b';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ==========================================
// SISTEMA DE PARTÍCULAS
// ==========================================
class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.03;
        this.size = 2 + Math.random() * 4;

        switch (type) {
            case 'collect':
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = -2 - Math.random() * 4;
                this.size = 3 + Math.random() * 3;
                break;
            case 'hit':
                this.vx = (Math.random() - 0.5) * 5;
                this.vy = (Math.random() - 0.5) * 5;
                break;
            case 'jump':
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = 1 + Math.random() * 2;
                this.size = 2 + Math.random() * 3;
                break;
            case 'dust':
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = -0.5 - Math.random();
                this.size = 2 + Math.random() * 2;
                break;
            case 'death':
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = -3 - Math.random() * 5;
                this.size = 3 + Math.random() * 4;
                break;
            case 'slash':
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 4;
                this.decay = 0.06;
                break;
            default:
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = -1 - Math.random() * 3;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life -= this.decay;
        this.vx *= 0.98;
    }

    draw() {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function spawnParticles(x, y, count, color, type) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, type));
    }
}

// ==========================================
// RENDERIZAÇÃO DO FUNDO
// ==========================================
function drawBackground() {
    // Gradiente do céu
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#0d1b2a');
    skyGrad.addColorStop(0.3, '#1b2838');
    skyGrad.addColorStop(0.6, '#1a3a2a');
    skyGrad.addColorStop(1, '#0f2818');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrelas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 50; i++) {
        const sx = (i * 137 + 50) % canvas.width;
        const sy = (i * 97 + 20) % (canvas.height * 0.4);
        const twinkle = Math.sin(frameCount * 0.03 + i) * 0.5 + 0.5;
        ctx.globalAlpha = twinkle * 0.5;
        ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // Lua
    ctx.fillStyle = 'rgba(255, 255, 220, 0.8)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 60, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 200, 0.15)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 60, 50, 0, Math.PI * 2);
    ctx.fill();
    // Crateras
    ctx.fillStyle = 'rgba(200, 200, 180, 0.3)';
    ctx.beginPath();
    ctx.arc(canvas.width - 108, 55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(canvas.width - 92, 65, 3, 0, Math.PI * 2);
    ctx.fill();

    // Nuvens
    for (const cloud of clouds) {
        cloud.x += cloud.speed;
        if (cloud.x > CONFIG.WORLD_WIDTH + 200) cloud.x = -200;
        const cx = cloud.x - camera.x * 0.05;
        ctx.fillStyle = `rgba(200, 220, 200, ${cloud.opacity})`;
        ctx.beginPath();
        ctx.ellipse(cx, cloud.y, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - cloud.w * 0.25, cloud.y + 5, cloud.w * 0.3, cloud.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + cloud.w * 0.25, cloud.y + 3, cloud.w * 0.25, cloud.h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Montanhas distantes (parallax lento)
    drawMountains(camera.x * 0.1, '#0a1f12', 0.4, 200);
    drawMountains(camera.x * 0.15, '#0d2a18', 0.5, 170);

    // Árvores de fundo (parallax médio)
    drawBackgroundTrees(camera.x * 0.25, '#0a2610', 0.7, 250);
    drawBackgroundTrees(camera.x * 0.4, '#0d3015', 0.85, 200);
    drawBackgroundTrees(camera.x * 0.6, '#103a1a', 1.0, 150);
}

function drawMountains(scrollX, color, scale, baseHeight) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = -100; x <= canvas.width + 100; x += 5) {
        const wx = x + scrollX;
        const h = Math.sin(wx * 0.003) * 80 * scale +
                  Math.sin(wx * 0.008) * 40 * scale +
                  Math.sin(wx * 0.001) * 60 * scale;
        ctx.lineTo(x, canvas.height - baseHeight - h);
    }
    ctx.lineTo(canvas.width + 100, canvas.height);
    ctx.fill();
}

function drawBackgroundTrees(scrollX, color, opacity, baseY) {
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let x = -50; x < canvas.width + 100; x += 35 + Math.sin(x * 0.1) * 10) {
        const wx = x + scrollX;
        const h = 40 + Math.sin(wx * 0.05) * 20 + Math.cos(wx * 0.03) * 15;
        const treeY = canvas.height - baseY + Math.sin(wx * 0.02) * 20;

        // Tronco
        ctx.fillStyle = color;
        ctx.fillRect(x + 4, treeY, 6, 30);

        // Copa triangular
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + 7, treeY - h);
        ctx.lineTo(x + 7 + 18, treeY + 5);
        ctx.lineTo(x + 7 - 18, treeY + 5);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 7, treeY - h + 15);
        ctx.lineTo(x + 7 + 22, treeY + 15);
        ctx.lineTo(x + 7 - 22, treeY + 15);
        ctx.fill();
    }
    ctx.restore();
}

// ==========================================
// RENDERIZAÇÃO DO CHÃO
// ==========================================
function drawGround() {
    const gx = -camera.x % 40;

    // Camada principal do chão
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
    groundGrad.addColorStop(0, '#2d5a27');
    groundGrad.addColorStop(0.05, '#3d6b35');
    groundGrad.addColorStop(0.15, '#4a3628');
    groundGrad.addColorStop(0.4, '#3a2a1a');
    groundGrad.addColorStop(1, '#2a1a0e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY - 5, canvas.width, canvas.height - groundY + 5);

    // Grama no topo do chão
    for (let x = gx - 40; x < canvas.width + 40; x += 5) {
        const grassH = 5 + Math.sin((x + camera.x) * 0.2) * 3 + Math.sin(frameCount * 0.03 + x * 0.1) * 2;
        ctx.fillStyle = `hsl(${115 + Math.sin(x * 0.05) * 10}, ${55 + Math.sin(x * 0.1) * 10}%, ${32 + Math.sin(x * 0.07) * 8}%)`;
        ctx.fillRect(x, groundY - grassH, 3, grassH + 2);
    }

    // Detalhes de terra
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let x = gx - 40; x < canvas.width + 40; x += 20) {
        const wx = x + camera.x;
        if (Math.sin(wx * 0.3) > 0.5) {
            ctx.fillRect(x, groundY + 15 + Math.sin(wx * 0.1) * 5, 8, 3);
        }
    }
}

// ==========================================
// RENDERIZAÇÃO DE DECORAÇÕES
// ==========================================
function drawDecorations(layer) {
    for (const dec of decorations) {
        const sx = dec.x - camera.x;
        if (sx < -100 || sx > canvas.width + 100) continue;

        if (dec.type === 'tree' && layer === 'back') {
            drawTree(sx, groundY, dec.scale);
        } else if (dec.type === 'bush' && layer === 'front') {
            drawBush(sx, groundY, dec.scale);
        } else if (dec.type === 'flower' && layer === 'front') {
            drawFlower(sx, groundY, dec.color);
        } else if (dec.type === 'mushroom' && layer === 'front') {
            drawMushroom(sx, groundY, dec.scale);
        }
    }
}

function drawTree(x, y, scale) {
    const h = 80 * scale;
    const trunkW = 10 * scale;
    const trunkH = h * 0.4;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 25 * scale, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco
    ctx.fillStyle = '#4a3525';
    ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
    // Textura do tronco
    ctx.fillStyle = '#3a2515';
    ctx.fillRect(x - trunkW / 2 + 2, y - trunkH + 5, 2, trunkH - 10);

    // Raízes
    ctx.fillStyle = '#4a3525';
    ctx.beginPath();
    ctx.moveTo(x - trunkW, y);
    ctx.quadraticCurveTo(x - trunkW / 2, y - 5, x - trunkW / 2, y - 3);
    ctx.lineTo(x + trunkW / 2, y - 3);
    ctx.quadraticCurveTo(x + trunkW / 2, y - 5, x + trunkW, y);
    ctx.fill();

    // Copa (múltiplas camadas)
    const canopyLayers = [
        { yOff: 0, r: 28 * scale, color: '#1a5c2a' },
        { yOff: -12 * scale, r: 24 * scale, color: '#1e6e30' },
        { yOff: -22 * scale, r: 18 * scale, color: '#228b38' },
    ];

    for (const layer of canopyLayers) {
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.arc(x, y - trunkH - 10 + layer.yOff, layer.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Detalhes de folhas
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.arc(x - 5 * scale, y - trunkH - 20, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
}

function drawBush(x, y, scale) {
    const colors = ['#1e6e30', '#228b38', '#2ca845'];
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(x + (i - 1) * 10 * scale, y - 8 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawFlower(x, y, color) {
    // Caule
    ctx.strokeStyle = '#2ca845';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 15);
    ctx.stroke();

    // Pétalas
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + frameCount * 0.005;
        ctx.beginPath();
        ctx.ellipse(
            x + Math.cos(angle) * 4,
            y - 15 + Math.sin(angle) * 4,
            3, 2, angle, 0, Math.PI * 2
        );
        ctx.fill();
    }
    // Centro
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(x, y - 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawMushroom(x, y, scale) {
    // Caule
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(x - 3 * scale, y - 10 * scale, 6 * scale, 10 * scale);
    // Chapéu
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.ellipse(x, y - 10 * scale, 10 * scale, 6 * scale, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - 10 * scale, 10 * scale, 2 * scale, 0, 0, Math.PI);
    ctx.fill();
    // Manchas brancas
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 3 * scale, y - 13 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4 * scale, y - 12 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
}

// ==========================================
// RENDERIZAÇÃO DA ALDEIA
// ==========================================
function drawVillage() {
    const vx = villageX - camera.x;
    if (vx > canvas.width + 200 || vx < -500) return;

    // Brilho da aldeia (guia para o jogador)
    const pulseAlpha = 0.05 + Math.sin(frameCount * 0.03) * 0.03;
    const glow = ctx.createRadialGradient(vx + 150, groundY - 80, 20, vx + 150, groundY - 80, 250);
    glow.addColorStop(0, `rgba(255, 200, 50, ${pulseAlpha})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(vx + 150, groundY - 80, 250, 0, Math.PI * 2);
    ctx.fill();

    // Oca principal (grande)
    drawOca(vx + 80, groundY, 1.2);
    // Ocas menores
    drawOca(vx + 200, groundY, 0.8);
    drawOca(vx + 300, groundY, 0.9);

    // Fogueira
    drawCampfire(vx + 150, groundY);

    // Totem
    drawTotem(vx + 250, groundY);

    // Placa "Aldeia Segura"
    ctx.fillStyle = '#5D3A1A';
    ctx.fillRect(vx - 20, groundY - 60, 8, 50);
    // Placa
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(vx - 40, groundY - 70, 50, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('ALDEIA', vx - 15, groundY - 57);
}

function drawOca(x, y, scale) {
    // Oca indígena (formato de cúpula)
    const w = 70 * scale;
    const h = 50 * scale;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, w / 2 + 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo da oca (palha/madeira)
    ctx.fillStyle = '#A0845C';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h);
    ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y);
    ctx.fill();

    // Textura de palha
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const lh = y - h * 0.2 - i * h * 0.15;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + i * 3, lh + i * 5);
        ctx.quadraticCurveTo(x, lh - 3, x + w / 2 - i * 3, lh + i * 5);
        ctx.stroke();
    }

    // Entrada
    ctx.fillStyle = '#3a2510';
    ctx.beginPath();
    ctx.ellipse(x, y, 10 * scale, 18 * scale, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Decoração tribal na entrada
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 12 * scale, y - 36 * scale, 24 * scale, 3);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x - 10 * scale, y - 32 * scale, 20 * scale, 2);
}

function drawCampfire(x, y) {
    // Lenha
    ctx.fillStyle = '#5D3A1A';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    ctx.fillRect(-12, -5, 24, 5);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.3);
    ctx.fillRect(-12, -5, 24, 5);
    ctx.restore();

    // Pedras ao redor
    ctx.fillStyle = '#666';
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * 15, y - 3 + Math.sin(angle) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Fogo (animado)
    const fireColors = ['#ff4500', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];
    for (let i = 0; i < 5; i++) {
        const fh = 12 + i * 5 + Math.sin(frameCount * 0.15 + i) * 5;
        ctx.fillStyle = fireColors[i];
        ctx.globalAlpha = 0.7 - i * 0.1;
        ctx.beginPath();
        ctx.moveTo(x - 8 + i * 2, y - 5);
        ctx.quadraticCurveTo(
            x + Math.sin(frameCount * 0.1 + i) * 5,
            y - fh,
            x + 8 - i * 2,
            y - 5
        );
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Brilho do fogo
    const fireGlow = ctx.createRadialGradient(x, y - 15, 5, x, y - 15, 60);
    fireGlow.addColorStop(0, 'rgba(255, 150, 50, 0.15)');
    fireGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(x, y - 15, 60, 0, Math.PI * 2);
    ctx.fill();

    // Faíscas
    for (let i = 0; i < 3; i++) {
        const sparkX = x + Math.sin(frameCount * 0.08 + i * 2) * 15;
        const sparkY = y - 20 - (frameCount * 0.5 + i * 20) % 40;
        ctx.fillStyle = `rgba(255, ${150 + i * 30}, 0, ${0.8 - ((frameCount * 0.5 + i * 20) % 40) / 50})`;
        ctx.fillRect(sparkX, sparkY, 2, 2);
    }
}

function drawTotem(x, y) {
    // Poste
    ctx.fillStyle = '#5D3A1A';
    ctx.fillRect(x - 8, y - 80, 16, 80);

    // Rosto 1 (topo)
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x - 14, y - 80, 28, 25);
    // Olhos
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 10, y - 75, 7, 6);
    ctx.fillRect(x + 3, y - 75, 7, 6);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 8, y - 73, 4, 4);
    ctx.fillRect(x + 5, y - 73, 4, 4);
    // Boca
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(x - 6, y - 63, 12, 4);

    // Rosto 2 (meio)
    ctx.fillStyle = '#A0845C';
    ctx.fillRect(x - 12, y - 52, 24, 22);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x - 8, y - 48, 6, 5);
    ctx.fillRect(x + 3, y - 48, 6, 5);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x - 5, y - 38, 10, 3);

    // Asas decorativas
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 45);
    ctx.lineTo(x - 24, y - 50);
    ctx.lineTo(x - 14, y - 35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 45);
    ctx.lineTo(x + 24, y - 50);
    ctx.lineTo(x + 14, y - 35);
    ctx.fill();
}

// ==========================================
// ATUALIZAÇÃO DO HUD
// ==========================================
function updateHUD() {
    const healthPercent = (player.health / CONFIG.PLAYER_MAX_HEALTH) * 100;
    document.getElementById('health-bar-fill').style.width = healthPercent + '%';
    document.getElementById('score-value').textContent = score;

    const distPercent = Math.min(100, (player.x / villageX) * 100);
    document.getElementById('distance-bar-fill').style.width = distPercent + '%';
}

// ==========================================
// CÂMERA
// ==========================================
function updateCamera() {
    const targetX = player.x - canvas.width / 3;
    camera.x += (targetX - camera.x) * 0.08;
    camera.x = Math.max(0, Math.min(camera.x, CONFIG.WORLD_WIDTH - canvas.width));
    camera.y = 0; // Câmera fixa no eixo Y para alinhar chão corretamente
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================
function gameLoop() {
    frameCount++;

    if (gameState === 'playing') {
        update();
    }

    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    player.update();
    updateCamera();
    updateHUD();

    for (const c of collectibles) c.update();
    for (const e of enemies) e.update();
    for (const l of leafParticles) l.update();
    for (const f of fireflies) f.update();

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    if (gameState === 'playing' || gameState === 'paused') {
        drawDecorations('back');
        drawGround();

        // Plataformas
        for (const p of platforms) p.draw();

        // Zonas de perigo
        for (const h of hazards) h.draw();

        // Espinhos
        for (const s of spikes) s.draw();

        // Coletáveis
        for (const c of collectibles) c.draw();

        // Inimigos
        for (const e of enemies) e.draw();

        // Jogador
        player.draw();

        // Aldeia
        drawVillage();

        drawDecorations('front');

        // Folhas
        for (const l of leafParticles) l.draw();

        // Vagalumes
        for (const f of fireflies) f.draw();

        // Partículas
        for (const p of particles) p.draw();

        // Névoa no chão
        drawGroundFog();
    }
}

function drawGroundFog() {
    ctx.save();
    const fogY = groundY - camera.y - 20;
    const fogGrad = ctx.createLinearGradient(0, fogY - 30, 0, fogY + 20);
    fogGrad.addColorStop(0, 'transparent');
    fogGrad.addColorStop(0.5, 'rgba(150, 200, 150, 0.06)');
    fogGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, fogY - 30, canvas.width, 50);
    ctx.restore();
}

// ==========================================
// CONTROLE DE ESTADOS
// ==========================================
function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('visible');
    generateWorld();
    gameState = 'playing';
    updateHUD();
}

function showInstructions() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('instructions-screen').classList.remove('hidden');
}

function hideInstructions() {
    document.getElementById('instructions-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-screen').classList.remove('hidden');
    }
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-screen').classList.add('hidden');
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    const dist = Math.min(100, Math.round((player.x / villageX) * 100));
    document.getElementById('final-distance').textContent = dist + '%';
}

function victory() {
    gameState = 'victory';
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('victory-screen').classList.remove('hidden');
    document.getElementById('victory-fruits').textContent = resourceCounts.fruits;
    document.getElementById('victory-herbs').textContent = resourceCounts.herbs;
    document.getElementById('victory-water').textContent = resourceCounts.water;
    document.getElementById('victory-total').textContent = score;
}

function restartGame() {
    hideAllScreens();
    document.getElementById('hud').classList.add('visible');
    generateWorld();
    gameState = 'playing';
    updateHUD();
}

function goToMenu() {
    hideAllScreens();
    document.getElementById('menu-screen').classList.remove('hidden');
    document.getElementById('hud').classList.remove('visible');
    gameState = 'menu';
}

function hideAllScreens() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('instructions-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
}

// ==========================================
// INICIAR
// ==========================================
window.addEventListener('load', init);
