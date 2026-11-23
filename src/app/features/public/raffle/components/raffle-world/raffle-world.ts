import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';

import { PoolEntry } from '../../data/raffle.service';

export type WorldMode = 'idle' | 'spinning' | 'revealed';

const SHIRT = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
const SKIN = ['#F6D3B3', '#E8B48A', '#C98E62', '#9C6A44', '#70482C'];
const HAIR = ['#1F1A17', '#3B2A20', '#5C3A21', '#8A5A2B', '#C9A227', '#B5462F'];
const PANTS = ['#27324F', '#3A3F4B', '#5A4636'];
const INK = '#14182B';
const YELLOW = '#FBBC05';
/** Dónde empieza el piso dentro del lienzo: arriba queda aire para cabezas, fotos y carteles. */
const FLOOR_TOP = 0.34;
/** La foto se achica a esto y se agranda sin suavizar: queda en pixel art. */
const AVATAR_PX = 12;
const MAX_WALKERS = 140;

/** Hash estable (FNV-1a) del id: la misma persona es el mismo muñeco en cada recarga. */
export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Quiénes caminan: si no caben todos, una muestra estable y pareja (no solo los de más tickets). */
export function pickWalkers(pool: PoolEntry[], max: number): PoolEntry[] {
  if (pool.length <= max) return pool;
  return [...pool]
    .sort((a, b) => hashId(a.registrationId) - hashId(b.registrationId))
    .slice(0, max);
}

interface Walker {
  id: string;
  name: string;
  tickets: number;
  shirt: string;
  skin: string;
  hair: string;
  pants: string;
  longHair: boolean;
  /** Posición y destino: x a lo ancho y z de fondo (0) a frente (1). */
  x: number;
  z: number;
  tx: number;
  tz: number;
  /** Segundos que se queda parado antes de volver a caminar. */
  wait: number;
  speed: number;
  dir: 1 | -1;
  moving: boolean;
  step: number;
  seed: number;
  /** Tickets que acaba de sumar y cuánto falta para que se borre el "+N". */
  gain: number;
  gainLeft: number;
  avatar: HTMLCanvasElement | null;
  /** Si en el último cuadro su cartel mostró el nombre. */
  named: boolean;
}

/** Dónde va el cartel de un caminante ya dibujado. */
interface Tag {
  w: Walker;
  x: number;
  above: number;
  u: number;
  star: boolean;
}

/** El piso del sorteo: una personita de pixel art por cada participante, con su nombre y sus tickets. */
@Component({
  selector: 'app-raffle-world',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tiles"></div>
    <div class="edge"></div>
    <canvas #canvas></canvas>
  `,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      perspective: 260px;
    }

    /* El piso: baldosas acostadas hacia el fondo. Arranca al 34% del alto, igual que FLOOR_TOP. */
    .tiles {
      position: absolute;
      inset: 34% 0 auto;
      height: 110%;
      transform: rotateX(58deg);
      transform-origin: top;
      background:
        linear-gradient(#0b1026, transparent 55%),
        repeating-conic-gradient(#232e60 0 25%, #161e45 0 50%) 50% 0 / 5rem 5rem;
    }

    /* Borde del escenario con los colores de Google. */
    .edge {
      position: absolute;
      inset: calc(34% - 6px) 0 auto;
      height: 6px;
      background: linear-gradient(90deg, #4285f4 25%, #ea4335 0 50%, #fbbc05 0 75%, #34a853 0);
    }

    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  `,
})
export class RaffleWorld implements OnDestroy {
  readonly people = input<PoolEntry[]>([]);
  readonly mode = input<WorldMode>('idle');
  /** El ganador en pantalla: se queda en el mundo aunque ya salió del grupo. */
  readonly winner = input<PoolEntry | null>(null);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly still =
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private ctx: CanvasRenderingContext2D | null = null;
  private observer?: ResizeObserver;
  private walkers = new Map<string, Walker>();
  private width = 0;
  private height = 0;
  private frame = 0;
  private last = 0;
  private time = 0;

  constructor() {
    effect(() => {
      this.sync();
      this.mode();
      // Sin animación no hay bucle: cada cambio se dibuja ya en su lugar final.
      if (this.still) {
        this.update(60);
        this.render();
      }
    });
    afterNextRender(() => this.start());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  private start(): void {
    const canvas = this.canvas().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    // El lienzo no espera a la fuente: se vuelve a dibujar cuando llega.
    void document.fonts?.load('12px "Pixelify Sans"').then(() => this.render());
    if (!this.still) this.frame = requestAnimationFrame(this.tick);
  }

  private resize(): void {
    const canvas = this.canvas().nativeElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    canvas.width = Math.round(this.width * dpr);
    canvas.height = Math.round(this.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sync();
    this.render();
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  /** Pone al día a los caminantes con el grupo: entran los nuevos, se van los que salieron. */
  private sync(): void {
    const winner = this.winner();
    const max = Math.min(MAX_WALKERS, Math.max(12, Math.round((this.width || 1200) / 13)));
    const shown = pickWalkers(this.people(), max);
    const list =
      winner && !shown.some((p) => p.registrationId === winner.registrationId)
        ? [...shown, winner]
        : shown;
    const first = this.walkers.size === 0;
    const next = new Map<string, Walker>();
    for (const p of list) {
      const w = this.walkers.get(p.registrationId) ?? this.spawn(p, first);
      if (p.tickets > w.tickets) {
        w.gain = p.tickets - w.tickets;
        w.gainLeft = 3;
      }
      w.tickets = p.tickets;
      next.set(w.id, w);
    }
    this.walkers = next;
  }

  /** `scattered`: en la primera carga ya están repartidos; después, los nuevos entran por un costado. */
  private spawn(p: PoolEntry, scattered: boolean): Walker {
    const h = hashId(p.registrationId);
    const w: Walker = {
      id: p.registrationId,
      name: p.name.split(' ')[0],
      tickets: p.tickets,
      shirt: SHIRT[h % SHIRT.length],
      skin: SKIN[(h >>> 3) % SKIN.length],
      hair: HAIR[(h >>> 7) % HAIR.length],
      pants: PANTS[(h >>> 11) % PANTS.length],
      longHair: ((h >>> 13) & 1) === 1,
      x: scattered ? 0.03 + Math.random() * 0.94 : Math.random() < 0.5 ? -0.04 : 1.04,
      z: Math.random(),
      tx: 0,
      tz: 0,
      wait: scattered ? Math.random() * 3 : 0,
      speed: 0.025 + Math.random() * 0.03,
      dir: h % 2 ? 1 : -1,
      moving: false,
      step: 0,
      seed: (h % 628) / 100,
      gain: 0,
      gainLeft: 0,
      avatar: null,
      named: false,
    };
    this.retarget(w);
    if (p.avatarUrl) this.loadAvatar(w, p.avatarUrl);
    return w;
  }

  private retarget(w: Walker): void {
    w.tx = Math.min(0.97, Math.max(0.03, w.x + (Math.random() - 0.5) * 0.5));
    w.tz = Math.random();
  }

  private loadAvatar(w: Walker, url: string): void {
    const img = new Image();
    // Las fotos de Google no cargan si el pedido lleva referrer.
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const tiny = document.createElement('canvas');
      tiny.width = tiny.height = AVATAR_PX;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) return;
      tiny
        .getContext('2d')
        ?.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_PX,
          AVATAR_PX,
        );
      w.avatar = tiny;
      if (this.still) this.render();
    };
    img.src = url;
  }

  private starId(): string | undefined {
    return this.mode() === 'revealed' ? this.winner()?.registrationId : undefined;
  }

  private update(dt: number): void {
    const starId = this.starId();
    for (const w of this.walkers.values()) {
      if (w.gainLeft > 0) w.gainLeft -= dt;
      const star = w.id === starId;
      if (star) {
        // El ganador corre al frente, al centro.
        w.tx = 0.5;
        w.tz = 1;
        w.wait = 0;
      }
      w.moving = false;
      if (w.wait > 0) {
        w.wait -= dt;
        continue;
      }
      const dx = w.tx - w.x;
      const dz = w.tz - w.z;
      const dist = Math.hypot(dx, dz);
      const reach = w.speed * (star ? 7 : 1) * dt;
      if (dist <= reach) {
        w.x = w.tx;
        w.z = w.tz;
        if (!star) {
          this.retarget(w);
          w.wait = 0.5 + Math.random() * 4;
        }
        continue;
      }
      w.x += (dx / dist) * reach;
      w.z += (dz / dist) * reach;
      if (Math.abs(dx) > 0.002) w.dir = dx > 0 ? 1 : -1;
      w.moving = true;
      w.step += dt * (star ? 16 : 7);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx || !this.width) return;
    const top = this.height * FLOOR_TOP;
    const depth = this.height - top - 6;
    const base = this.height / 62;
    const mode = this.mode();
    const starId = this.starId();
    ctx.clearRect(0, 0, this.width, this.height);
    // Poner el tamaño del lienzo lo reinicia: sin esto las fotos salen borrosas.
    ctx.imageSmoothingEnabled = false;
    ctx.textBaseline = 'middle';

    const tags: Tag[] = [];
    const byDepth = [...this.walkers.values()].sort((a, b) => a.z - b.z);
    for (const w of byDepth) {
      const star = w.id === starId;
      // Unidad entera por profundidad: los de atrás más chicos, y los píxeles siempre nítidos.
      const u = Math.max(2, Math.round((0.55 + 0.45 * w.z) * base * (star ? 1.5 : 1)));
      const x = Math.round(w.x * this.width);
      const ground = Math.round(top + w.z * depth);
      let hop = 0;
      if (star) hop = Math.abs(Math.sin(this.time * 7)) * 5 * u;
      else if (mode === 'spinning') hop = Math.abs(Math.sin(this.time * 9 + w.seed)) * 2 * u;
      else if (mode === 'revealed') hop = Math.max(0, Math.sin(this.time * 6 + w.seed)) * 1.5 * u;
      else if (w.gainLeft > 2.5) hop = 2 * u;
      if (star) this.spotlight(ctx, x, ground, u);
      const above = this.drawWalker(ctx, w, x, ground, Math.round(hop), u, star);
      tags.push({ w, x, above, u, star });
    }
    this.drawTags(ctx, tags);
  }

  private spotlight(ctx: CanvasRenderingContext2D, x: number, ground: number, u: number): void {
    ctx.fillStyle = 'rgba(251, 188, 5, 0.16)';
    ctx.beginPath();
    ctx.moveTo(x - 5 * u, 0);
    ctx.lineTo(x + 5 * u, 0);
    ctx.lineTo(x + 13 * u, ground);
    ctx.lineTo(x - 13 * u, ground);
    ctx.fill();
    ctx.fillStyle = 'rgba(251, 188, 5, 0.3)';
    ctx.fillRect(x - 13 * u, ground - 2 * u, 26 * u, 4 * u);
  }

  /** Muñeco de 10×14 "píxeles" con los pies en (x, ground); `hop` lo levanta. Devuelve dónde va su cartel. */
  private drawWalker(
    ctx: CanvasRenderingContext2D,
    w: Walker,
    x: number,
    ground: number,
    hop: number,
    u: number,
    star: boolean,
  ): number {
    const y = ground - hop;
    const px = (dx: number, dy: number, wide: number, tall: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.fillRect(x + dx * u, y + dy * u, wide * u, tall * u);
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x - 4 * u, ground - u, 8 * u, 2 * u);

    // Piernas: al caminar se turnan para levantarse.
    const lifted = w.moving ? Math.floor(w.step) % 2 : -1;
    px(-3, -3, 2, lifted === 0 ? 2 : 3, w.pants);
    px(1, -3, 2, lifted === 1 ? 2 : 3, w.pants);
    // Cuerpo y brazos: arriba cuando salta.
    px(-4, -8, 8, 5, w.shirt);
    const arm = hop > u ? -11 : -8;
    px(-5, arm, 1, 3, w.shirt);
    px(4, arm, 1, 3, w.shirt);
    px(-5, arm === -8 ? -5 : -12, 1, 1, w.skin);
    px(4, arm === -8 ? -5 : -12, 1, 1, w.skin);
    // Cabeza, pelo y ojos (miran hacia donde camina).
    px(-3, -13, 6, 5, w.skin);
    px(-3, -14, 6, 2, w.hair);
    px(w.dir > 0 ? -3 : 2, -12, 1, w.longHair ? 4 : 2, w.hair);
    px(w.dir > 0 ? -1 : -3, -11, 1, 1, INK);
    px(w.dir > 0 ? 2 : 0, -11, 1, 1, INK);
    if (star) {
      px(-3, -16, 6, 2, YELLOW);
      px(-3, -17, 1, 1, YELLOW);
      px(-1, -17, 2, 1, YELLOW);
      px(2, -17, 1, 1, YELLOW);
    }

    let above = y - (star ? 19 : 16) * u;
    if (w.avatar) {
      // La foto flota sobre la cabeza.
      const size = 6 * u;
      const bob = Math.round(Math.sin(this.time * 2 + w.seed) * u);
      above -= size + 2 * u;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - size / 2 - u, above + bob - u, size + 2 * u, size + 2 * u);
      ctx.drawImage(w.avatar, x - size / 2, above + bob, size, size);
      above -= 2 * u;
    }
    return above;
  }

  /**
   * Carteles (nombre + talón amarillo con los tickets), encima de todos los muñecos. No se pisan:
   * tiene lugar primero el ganador, quien acaba de sumar, quien ya mostraba su nombre (para que no
   * parpadeen) y los de más adelante. Al que no le entra el nombre le queda solo el talón.
   */
  private drawTags(ctx: CanvasRenderingContext2D, tags: Tag[]): void {
    const rank = (t: Tag): number =>
      (t.star ? 8 : 0) + (t.w.gainLeft > 0 ? 4 : 0) + (t.w.named ? 2 : 0) + t.w.z;
    tags.sort((a, b) => rank(b) - rank(a));
    const taken: [left: number, top: number, right: number, bottom: number][] = [];
    const free = (left: number, top: number, wide: number, tall: number): boolean =>
      !taken.some(([l, t, r, b]) => left < r && l < left + wide && top < b && t < top + tall);

    for (const { w, x, above, u } of tags) {
      const font = Math.max(10, u * 3);
      ctx.font = `${font}px "Pixelify Sans", system-ui, sans-serif`;
      const count = String(w.tickets);
      const nameWide = Math.ceil(ctx.measureText(w.name).width) + 8;
      const countWide = Math.ceil(ctx.measureText(count).width) + 8;
      const tall = font + 4;
      const top = above - tall;
      const fit = (wide: number): number =>
        Math.round(Math.min(this.width - wide - 2, Math.max(2, x - wide / 2)));

      let left = fit(nameWide + countWide);
      w.named = free(left, top, nameWide + countWide, tall);
      if (w.named) {
        taken.push([left, top, left + nameWide + countWide, top + tall]);
        ctx.fillStyle = 'rgba(8, 12, 30, 0.85)';
        ctx.fillRect(left, top, nameWide, tall);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText(w.name, left + 4, top + tall / 2 + 1);
        left += nameWide;
      } else {
        left = fit(countWide);
        if (!free(left, top, countWide, tall)) continue;
        taken.push([left, top, left + countWide, top + tall]);
      }
      ctx.fillStyle = w.gainLeft > 0 ? '#fff' : YELLOW;
      ctx.fillRect(left, top, countWide, tall);
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.fillText(count, left + 4, top + tall / 2 + 1);

      if (w.gainLeft > 0) {
        // "+N" que sube y se desvanece cuando alguien suma tickets.
        ctx.globalAlpha = Math.min(1, w.gainLeft);
        ctx.font = `${font + 6}px "Pixelify Sans", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = YELLOW;
        ctx.fillText(`+${w.gain}`, x, top - font - (3 - w.gainLeft) * 4 * u);
        ctx.globalAlpha = 1;
      }
    }
  }
}
