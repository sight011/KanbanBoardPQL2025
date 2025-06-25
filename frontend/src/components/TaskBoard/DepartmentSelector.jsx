import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './DepartmentSelector.css';

const DepartmentSelector = ({ departments, selectedDepartment, onDepartmentSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (department) => {
        setIsOpen(false);
        onDepartmentSelect(department);
    };

    return (
        <div className="department-selector" ref={dropdownRef}>
            <button
                className="department-selector__button"
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="department-selector__selected">
                    {selectedDepartment ? selectedDepartment.name : 'Select Department'}
                </span>
                <svg 
                    className={`department-selector__chevron${isOpen ? ' open' : ''}`}
                    width="16" height="16" viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ verticalAlign: 'middle' }}
                >
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            </button>
            {isOpen && (
                <ul className="department-selector__dropdown" role="listbox">
                    {departments.length === 0 && (
                        <li className="department-selector__option empty">No departments</li>
                    )}
                    {departments.map((department) => (
                        <li
                            key={department.id}
                            className={`department-selector__option${selectedDepartment && selectedDepartment.id === department.id ? ' selected' : ''}`}
                            onClick={() => handleSelect(department)}
                            role="option"
                            aria-selected={selectedDepartment && selectedDepartment.id === department.id}
                        >
                            <span className="department-selector__option-name">{department.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

DepartmentSelector.propTypes = {
    departments: PropTypes.array.isRequired,
    selectedDepartment: PropTypes.object,
    onDepartmentSelect: PropTypes.func.isRequired,
};

export default DepartmentSelector; 