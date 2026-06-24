// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputForm } from './InputForm';

describe('InputForm', () => {
  it('제출 시 현재 폼 값으로 onSubmit 호출', async () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('직장 위도'), '37.4979');
    await userEvent.type(screen.getByLabelText('직장 경도'), '127.0276');
    await userEvent.type(screen.getByLabelText('월세 예산(원)'), '800000');
    await userEvent.type(screen.getByLabelText('보증금 예산(원)'), '25000000');
    await userEvent.type(screen.getByLabelText('시간가치(원/시)'), '15000');
    await userEvent.click(screen.getByRole('button', { name: '추천 받기' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.workplaceLat).toBe('37.4979');
    expect(values.budgetMonthlyRent).toBe('800000');
    expect(values.commuteMode).toBe('transit'); // 기본값
  });
});
