# Style Guidelines & Accessibility Checklist

## Tailwind Utility Conventions

### Spacing
- Use consistent spacing scale: `p-4`, `p-6`, `p-8` for padding
- Margin: `m-2`, `m-4`, `mb-6`, `mt-8` for consistent vertical rhythm
- Gap for flex/grid: `gap-4`, `gap-6`, `space-x-4`, `space-y-2`

### Responsive Design
Use mobile-first approach with responsive prefixes:
```jsx
className="text-sm md:text-base lg:text-lg"
className="flex-col md:flex-row"
className="hidden md:flex"
className="w-full md:w-1/2 lg:w-1/3"
```

### Common Patterns
- **Containers**: `container mx-auto px-4 py-8`
- **Cards**: `bg-white rounded-lg shadow-md p-6`
- **Buttons**: `px-4 py-2 rounded font-medium transition-colors`
- **Focus states**: `focus:outline-none focus:ring-2 focus:ring-blue-500`
- **Hover states**: `hover:bg-blue-700 transition-colors duration-200`

### Color Conventions
- **Primary actions**: `bg-blue-600 hover:bg-blue-700`
- **Success**: `bg-green-500 text-white`
- **Error**: `bg-red-500 text-white`
- **Warning**: `bg-yellow-500 text-white`
- **Info**: `bg-blue-500 text-white`
- **Text**: `text-gray-900` (headings), `text-gray-600` (body)

## Accessibility Checklist

### 1. Semantic HTML
- ✅ Use proper heading hierarchy (`h1` → `h2` → `h3`)
- ✅ Use semantic elements: `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- ✅ Use `<button>` for actions, `<a>` for navigation

### 2. ARIA Labels
- ✅ Add `aria-label` to icon-only buttons
- ✅ Use `aria-labelledby` to link labels with complex content
- ✅ Add `aria-describedby` for error messages and hints
- ✅ Use `aria-live` for dynamic content (toasts, status updates)
- ✅ Set `aria-invalid="true"` on form fields with errors
- ✅ Use `aria-current="page"` for active navigation items
- ✅ Add `aria-expanded` for collapsible content

### 3. Keyboard Navigation
- ✅ All interactive elements must be keyboard accessible
- ✅ Visible focus indicators on all focusable elements
- ✅ Logical tab order (use `tabIndex` only when necessary)
- ✅ Support `Enter` and `Space` for custom controls
- ✅ Trap focus in modals/dialogs
- ✅ Support `Escape` to close modals

### 4. Form Accessibility
- ✅ All inputs must have associated `<label>` elements
- ✅ Use `htmlFor` to link labels with inputs
- ✅ Provide clear error messages
- ✅ Mark required fields visually and with `required` attribute
- ✅ Group related inputs with `<fieldset>` and `<legend>`
- ✅ Provide helpful placeholder text (not as replacement for labels)

### 5. Color Contrast
- ✅ Text contrast ratio ≥ 4.5:1 (normal text)
- ✅ Text contrast ratio ≥ 3:1 (large text 18pt+)
- ✅ Don't rely on color alone to convey information
- ✅ Ensure focus indicators have sufficient contrast

### 6. Screen Reader Support
- ✅ Use `sr-only` class for screen-reader-only text
- ✅ Hide decorative elements with `aria-hidden="true"`
- ✅ Provide alt text for images
- ✅ Use `role` attributes when semantic HTML isn't sufficient

## Code Examples

### Accessible Input Field
```jsx
<div>
  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
    Email Address <span className="text-red-500">*</span>
  </label>
  <input
    type="email"
    id="email"
    name="email"
    required
    aria-required="true"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors.email ? 'border-red-500' : 'border-gray-300'
    }`}
  />
  {errors.email && (
    <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
      {errors.email}
    </p>
  )}
</div>
```

### Accessible Button
```jsx
// Standard button with text
<button
  type="button"
  onClick={handleClick}
  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={isLoading}
>
  Submit
</button>

// Icon-only button
<button
  onClick={handleClose}
  className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
  aria-label="Close dialog"
>
  <svg className="w-5 h-5" /* ... */>
    {/* X icon */}
  </svg>
</button>
```

### Accessible Form Group
```jsx
<fieldset className="space-y-4">
  <legend className="text-lg font-semibold text-gray-900 mb-4">
    Contact Preferences
  </legend>
  
  <div className="space-y-2">
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        name="emailNotifications"
        checked={preferences.emailNotifications}
        onChange={handleChange}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">Email notifications</span>
    </label>
    
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        name="smsNotifications"
        checked={preferences.smsNotifications}
        onChange={handleChange}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">SMS notifications</span>
    </label>
  </div>
</fieldset>
```

### Accessible Modal/Dialog
```jsx
<div
  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  onClick={handleBackdropClick}
>
  <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
    <h2 id="modal-title" className="text-xl font-bold mb-4">
      Confirm Action
    </h2>
    <p id="modal-description" className="text-gray-600 mb-6">
      Are you sure you want to proceed?
    </p>
    <div className="flex space-x-3">
      <button
        onClick={handleConfirm}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Confirm
      </button>
      <button
        onClick={handleCancel}
        className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        Cancel
      </button>
    </div>
  </div>
</div>
```

### Screen Reader Only Text
```jsx
// Utility class for screen reader only content
<span className="sr-only">
  Connection status: {isOnline ? 'Online' : 'Offline'}
</span>

// Add to index.css or App.css:
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Accessible Navigation
```jsx
<nav aria-label="Main navigation">
  <ul className="flex space-x-4">
    <li>
      <Link
        to="/"
        className="px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-current={isActive('/') ? 'page' : undefined}
      >
        Home
      </Link>
    </li>
    {/* More items... */}
  </ul>
</nav>
```

## Testing Checklist

### Manual Testing
- [ ] Navigate entire app using only keyboard (Tab, Enter, Space, Escape)
- [ ] Verify all focus indicators are visible
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Check color contrast with browser DevTools
- [ ] Test responsive design on mobile, tablet, and desktop
- [ ] Verify form validation messages are announced

### Automated Testing
- [ ] Use browser accessibility audits (Lighthouse, axe DevTools)
- [ ] Validate HTML semantics
- [ ] Check for ARIA violations

## Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
