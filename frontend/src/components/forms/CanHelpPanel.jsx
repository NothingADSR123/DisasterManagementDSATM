import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

function CanHelpPanel({ onOffer }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    skills: [],
    availability: 'Immediate',
    maxRadius: '5km',
  });

  const [errors, setErrors] = useState({});

  const skillOptions = [
    'First Aid',
    'Transport',
    'Food',
    'Shelter',
    'Search',
  ];

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return value.trim().length < 2 ? 'Name must be at least 2 characters' : '';
      case 'phone':
        const phonePattern = /^[0-9]{10}$/;
        return !phonePattern.test(value.replace(/\D/g, '')) 
          ? 'Phone must be a valid 10-digit number' 
          : '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'skills') {
      setFormData((prev) => ({
        ...prev,
        skills: checked
          ? [...prev.skills, value]
          : prev.skills.filter((skill) => skill !== value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    
    if (error) {
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    newErrors.name = validateField('name', formData.name);
    newErrors.phone = validateField('phone', formData.phone);

    if (formData.skills.length === 0) {
      newErrors.skills = 'Please select at least one skill';
    }

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== '')
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  const isFormValid = () => {
    return (
      formData.name.trim().length >= 2 &&
      /^[0-9]{10}$/.test(formData.phone.replace(/\D/g, '')) &&
      formData.skills.length > 0
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (onOffer) {
        onOffer(formData);
      }

      // Reset form and collapse
      setFormData({
        name: '',
        phone: '',
        skills: [],
        availability: 'Immediate',
        maxRadius: '5km',
      });
      setErrors({});
      setIsExpanded(false);
    }
  };

  const getSummaryText = () => {
    if (!formData.name && formData.skills.length === 0) {
      return 'Click to offer help as a volunteer';
    }
    return `${formData.name || 'Unnamed'} • ${formData.skills.length} skill(s) • ${formData.maxRadius}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!isExpanded ? (
        /* Collapsed Card View */
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsExpanded(true)}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Volunteer to Help</h3>
              <p className="text-sm text-gray-600 mt-1">{getSummaryText()}</p>
            </div>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </Card>
      ) : (
        /* Expanded Form View */
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Volunteer to Help</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Collapse form"
            >
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Name Field */}
            <div>
              <label htmlFor="volunteer-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="volunteer-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'volunteer-name-error' : undefined}
              />
              {errors.name && (
                <p id="volunteer-name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="volunteer-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="volunteer-phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="1234567890"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'volunteer-phone-error' : undefined}
              />
              {errors.phone && (
                <p id="volunteer-phone-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Skills Field */}
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  Skills <span className="text-red-500">*</span>
                </legend>
                <div className="space-y-2">
                  {skillOptions.map((skill) => (
                    <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="skills"
                        value={skill}
                        checked={formData.skills.includes(skill)}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
                </div>
                {errors.skills && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.skills}
                  </p>
                )}
              </fieldset>
            </div>

            {/* Availability Field */}
            <div>
              <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
                Availability
              </label>
              <div className="flex space-x-4">
                {['Immediate', 'Later'].map((option) => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      value={option}
                      checked={formData.availability === option}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Max Radius Field */}
            <div>
              <label htmlFor="maxRadius" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Distance
              </label>
              <select
                id="maxRadius"
                name="maxRadius"
                value={formData.maxRadius}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1km">1 km</option>
                <option value="5km">5 km</option>
                <option value="10km">10 km</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid()}
                className="flex-1"
              >
                Submit Offer
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default CanHelpPanel;
