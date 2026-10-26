export default function ContentEditor({ value, onChange, id = 'content', disabled = false, placeholder }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={5000}
      disabled={disabled}
      placeholder={placeholder}
      className="field-control min-h-48 resize-y leading-6"
      aria-describedby={id + '-counter'}
    />
  )
}
