import { Injectable, signal } from '@angular/core';
import { Event } from './event.model';

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    slug: 'cloud-study-jam-2026',
    title: 'Cloud Study Jam 2026',
    date: '15 de junio, 2026',
    imageUrl: null,
    location: 'Universidad Autónoma Juan Misael Saracho',
    description: 'Taller práctico de Google Cloud para estudiantes y profesionales.',
  },
  {
    id: '2',
    slug: 'devfest-tarija-2026',
    title: 'DevFest Tarija 2026',
    date: '20 de julio, 2026',
    imageUrl: null,
    location: 'Centro de Convenciones Tarija',
    description: 'El evento de tecnología más grande del sur de Bolivia.',
  },
  {
    id: '3',
    slug: 'flutter-workshop',
    title: 'Flutter Workshop',
    date: '10 de agosto, 2026',
    imageUrl: null,
    location: 'Coworking Tarija',
    description: 'Introducción al desarrollo multiplataforma con Flutter.',
  },
  {
    id: '4',
    slug: 'build-with-ai',
    title: 'Build with AI',
    date: '5 de septiembre, 2026',
    imageUrl: null,
    location: 'UDABOL',
    description: 'Construye aplicaciones inteligentes usando Google AI.',
  },
  {
    id: '5',
    slug: 'google-io-extended',
    title: 'Google I/O Extended',
    date: '18 de octubre, 2026',
    imageUrl: null,
    location: 'Virtual / Tarija',
    description: 'Celebración local del Google I/O con streaming y networking.',
  },
  {
    id: '6',
    slug: 'firebase-codelab',
    title: 'Firebase Codelab',
    date: '12 de noviembre, 2026',
    imageUrl: null,
    location: 'Universidad Católica',
    description: 'Crea un backend sin servidores con Firebase y Angular.',
  },
];

@Injectable({ providedIn: 'root' })
export class PublicEventsService {
  readonly events = signal<Event[]>([]);
  readonly isEventLoading = signal(true);

  constructor() {
    this.loadMock();
  }

  private loadMock(): void {
    setTimeout(() => {
      this.events.set(MOCK_EVENTS);
      this.isEventLoading.set(false);
    }, 800);
  }
}
