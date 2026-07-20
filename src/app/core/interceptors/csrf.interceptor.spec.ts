import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { csrfInterceptor } from './csrf.interceptor';
import { HttpClient } from '@angular/common/http';

describe('csrfInterceptor', () => {
  let http: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
    Object.defineProperty(document, 'cookie', { value: '', writable: true });
  });

  it('should pass GET requests without CSRF header', () => {
    Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=abc123', writable: true });
    httpClient.get('/api/test').subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('should pass HEAD requests without CSRF header', () => {
    Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=abc123', writable: true });
    httpClient.head('/api/test').subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('should pass OPTIONS requests without CSRF header', () => {
    httpClient.options('/api/test').subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('should add CSRF header for POST requests when cookie exists', () => {
    Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=abc123', writable: true });
    httpClient.post('/api/test', {}).subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('abc123');
    req.flush({});
  });

  it('should add CSRF header for PUT requests', () => {
    Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=xyz', writable: true });
    httpClient.put('/api/test', {}).subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('xyz');
    req.flush({});
  });

  it('should add CSRF header for DELETE requests', () => {
    Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=del', writable: true });
    httpClient.delete('/api/test').subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('del');
    req.flush({});
  });

  it('should not add CSRF header for POST when no cookie', () => {
    Object.defineProperty(document, 'cookie', { value: '', writable: true });
    httpClient.post('/api/test', {}).subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('should add CSRF header for PATCH requests', () => {
    Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=patch', writable: true });
    httpClient.patch('/api/test', {}).subscribe();
    const req = http.expectOne('/api/test');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('patch');
    req.flush({});
  });
});
