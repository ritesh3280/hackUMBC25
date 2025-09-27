'use client';

export default function FocusPill({ focused = true }) {
  return (
    <div className={`focus-pill ${focused ? 'focused' : 'unfocused'}`}>
      {focused ? 'Focused' : 'Unfocused'}
    </div>
  );
}
