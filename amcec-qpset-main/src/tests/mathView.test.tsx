import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MathView } from '../components/MathView';

describe('MathView KaTeX component', () => {
  it('renders standard text and inline math without crashing', () => {
    const { container } = render(
      <MathView content="Calculate the eigenvalue for $\lambda = 2$ in the matrix." />
    );
    expect(container.textContent).toContain('Calculate the eigenvalue for');
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('renders display/block mode math without crashing', () => {
    const { container } = render(
      <MathView content="Evaluate the integral: $$\int_{0}^{\pi} \sin(x) dx$$" />
    );
    expect(container.textContent).toContain('Evaluate the integral:');
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });
});
