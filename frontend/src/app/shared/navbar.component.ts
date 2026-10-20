import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  template: `
    <nav [ngClass]="isMobile() ? 'bottom-nav' : 'side-nav'" aria-label="Main navigation">
      <a routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">
        <span class="nav-icon" aria-hidden="true">🏠</span>
        <span class="nav-label">Dashboard</span>
      </a>
      <a routerLink="/transactions" routerLinkActive="active" ariaCurrentWhenActive="page">
        <span class="nav-icon" aria-hidden="true">💸</span>
        <span class="nav-label">Transactions</span>
      </a>
      <a routerLink="/insights" routerLinkActive="active" ariaCurrentWhenActive="page">
        <span class="nav-icon" aria-hidden="true">📊</span>
        <span class="nav-label">Insights</span>
      </a>
      <a routerLink="/categories" routerLinkActive="active" ariaCurrentWhenActive="page">
        <span class="nav-icon" aria-hidden="true">🏷️</span>
        <span class="nav-label">Categories</span>
      </a>
    </nav>
  `,
  styles: [`
    .side-nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      width: 200px;
      height: 100vh;
      background: var(--surface);
      border-right: 1px solid var(--border);
      position: fixed;
      top: 0;
      left: 0;
    }
    .bottom-nav {
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      padding: 0.5rem 0;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--surface);
      border-top: 1px solid var(--border);
      z-index: 100;
    }
    a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 0.95rem;
      transition: background 0.15s, color 0.15s;
    }
    .bottom-nav a {
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.7rem;
      padding: 0.5rem 1rem;
    }
    a:hover { background: var(--hover); color: var(--text-primary); }
    a.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
    .nav-icon { font-size: 1.2rem; }
  `],
})
export class NavbarComponent {
  isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }
}
