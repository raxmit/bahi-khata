import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar.component';
import { ToastComponent } from './shared/toast.component';
import { AppStateService } from './core/app-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  template: `
    <div class="app-layout">
      <app-navbar />
      <main class="main-content">
        <router-outlet />
      </main>
      <app-toast />
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
    }
    .main-content {
      flex: 1;
      margin-left: 200px;
      padding: 1.5rem;
      min-width: 0;
    }
    @media (max-width: 767px) {
      .main-content {
        margin-left: 0;
        padding-bottom: 5rem; /* space for bottom nav */
      }
    }
  `],
})
export class App implements OnInit {
  private readonly state = inject(AppStateService);

  ngOnInit(): void {
    this.state.refreshAll();
  }
}
