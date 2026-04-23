/**
 * Hover (and focus-within) tooltip for field help. Screen readers still receive the
 * full text via the associated control’s `aria-describedby` pointing at the hidden span.
 */
export function HelpHint({ id, text }: { id: string; text: string }) {
  return (
    <span className='help-hint'>
      <span id={id} className='sr-only'>
        {text}
      </span>
      <span className='help-hint__anchor' aria-hidden='true' title={text}>
        <span className='help-hint__glyph'>i</span>
        <span className='help-hint__bubble'>{text}</span>
      </span>
    </span>
  );
}
