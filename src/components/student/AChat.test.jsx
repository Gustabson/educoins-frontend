import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AChat from './AChat';

const mocks = vi.hoisted(() => ({
  chatFriends: vi.fn(),
  chatClassroomInfo: vi.fn(),
  chatGlobalMsgs: vi.fn(),
  chatGlobalInfo: vi.fn(),
  chatSearch: vi.fn(),
  socket: {
    connected: true,
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../api', () => ({
  api: {
    customMe: vi.fn().mockResolvedValue({ owned: [] }),
    chatFriends: mocks.chatFriends,
    chatClassroomInfo: mocks.chatClassroomInfo,
    chatGlobalMsgs: mocks.chatGlobalMsgs,
    chatGlobalInfo: mocks.chatGlobalInfo,
    chatSearch: mocks.chatSearch,
    myGroups: vi.fn().mockResolvedValue([]),
  },
  connectSocket: vi.fn(() => mocks.socket),
  getSocket: vi.fn(() => null),
}));

vi.mock('../../ThemeContext', () => ({
  useTheme: () => ({
    primary: '#00aadd', isDark: true, txt: '#ffffff', sub: '#aab0c0',
    cardBg: '#17182c', pageBg: '#111225', inputBg: '#22243b',
    inputBd: '#343650', navBord: '#343650', navInact: '#7b8195',
  }),
}));

vi.mock('../shared/index', () => ({
  Av: ({ user }) => <span>{user?.nombre || 'Avatar'}</span>,
  OHdrA: ({ title }) => <h1>{title}</h1>,
  displayName: user => user?.apodo || user?.nombre || '',
}));

describe('AChat', () => {
  beforeEach(() => {
    localStorage.setItem('ec_token', 'test-token');
    mocks.chatFriends.mockReset().mockResolvedValue([]);
    mocks.chatClassroomInfo.mockReset().mockResolvedValue(null);
    mocks.chatGlobalMsgs.mockReset().mockResolvedValue([]);
    mocks.chatGlobalInfo.mockReset().mockResolvedValue({ conversation_id: 'global-id' });
    mocks.chatSearch.mockReset().mockResolvedValue([
      { id: 'user-2', nombre: 'María García', rol: 'student' },
    ]);
  });

  it('termina la carga aunque el alumno no tenga aula y abre Agregar', async () => {
    render(<AChat me={{ id: 'user-1', nombre: 'Alumno Demo' }} showToast={vi.fn()} onBack={vi.fn()} />);

    expect(await screen.findByText(/sin amigos todavía/i)).toBeInTheDocument();
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    expect(screen.getByRole('dialog', { name: /agregar contacto/i })).toBeInTheDocument();
    expect(screen.getByText(/al menos 2 caracteres/i)).toBeInTheDocument();
    expect(mocks.chatSearch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Ej.: María'), { target: { value: 'María' } });
    await waitFor(() => expect(mocks.chatSearch).toHaveBeenCalledWith('María'));
    expect((await screen.findAllByText('María García')).length).toBeGreaterThan(0);
  });
});
