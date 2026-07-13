import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './api';

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('devuelve los datos y agrega el token de sesión', async () => {
    localStorage.setItem('ec_token', 'jwt-prueba');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok:true, data:{ balance:42 } }),
    });

    await expect(apiFetch('/accounts/me', { timeoutMs:1000 })).resolves.toEqual({ balance:42 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-prueba');
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('timeoutMs');
  });

  it('borra una sesión rechazada por el servidor', async () => {
    localStorage.setItem('ec_token', 'jwt-vencido');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ ok:false, error:{ code:'INVALID_TOKEN', message:'Sesión vencida' } }),
    });

    await expect(apiFetch('/auth/me')).rejects.toMatchObject({ code:'INVALID_TOKEN', status:401 });
    expect(localStorage.getItem('ec_token')).toBeNull();
  });

  it('convierte respuestas rotas en un error entendible', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok:true, status:200, text:async () => '<html>Error</html>' });
    await expect(apiFetch('/health')).rejects.toEqual(expect.objectContaining({
      name:'ApiError', code:'INVALID_RESPONSE',
    }));
  });

  it('conserva código, mensaje y estado en ApiError', () => {
    expect(new ApiError('TEST', 'mensaje', 409)).toMatchObject({ code:'TEST', message:'mensaje', status:409 });
  });
});
