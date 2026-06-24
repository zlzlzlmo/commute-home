// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

function Hello() {
  return <p>안녕하세요</p>;
}

describe('component test infra', () => {
  it('renders a component in jsdom', () => {
    render(<Hello />);
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
  });
});
