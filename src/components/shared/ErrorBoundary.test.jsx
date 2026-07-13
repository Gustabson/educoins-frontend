import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function BrokenView() {
  throw new Error('fallo de prueba');
}

describe('ErrorBoundary', () => {
  it('ofrece una recuperación cuando falla una pantalla', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><BrokenView /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name:/recargar educoins/i })).toBeInTheDocument();
  });
});
