import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div class="toast" [ngClass]="toast.type" role="alert" aria-live="polite">
        {{ toast.message }}
        <button (click)="toastService.dismiss(toast.id)" aria-label="Dismiss notification">✕</button>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      min-width: 280px;
      max-width: 400px;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.2s ease;
    }
    .success { background: #d1fae5; color: #065f46; }
    .error   { background: #fee2e2; color: #991b1b; }
    .info    { background: #dbeafe; color: #1e40af; }
    button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.7;
      color: inherit;
    }
    button:hover { opacity: 1; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
  `],
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
