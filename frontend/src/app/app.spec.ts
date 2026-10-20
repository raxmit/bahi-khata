import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStateService } from './core/app-state.service';
import { routes } from './app.routes';
import { App } from './app';

describe('App', () => {
  const appState = { refreshAll: vi.fn() };

  beforeEach(async () => {
    appState.refreshAll.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: AppStateService, useValue: appState },
      ],
    }).compileComponents();
  });

  it('creates the app and refreshes state on startup', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(appState.refreshAll).toHaveBeenCalledOnce();
  });

  it('renders the navigation, page outlet, and toast region', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(compiled.querySelector('main router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-toast')).not.toBeNull();
  });
});
