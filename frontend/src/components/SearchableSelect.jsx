import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './SearchableSelect.css';

const DropdownPortal = ({ children, parentRef }) => {
    const [styles, setStyles] = useState({});
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (parentRef.current && dropdownRef.current) {
            const parentRect = parentRef.current.getBoundingClientRect();
            setStyles({
                position: 'fixed',
                top: parentRect.bottom + window.scrollY,
                left: parentRect.left + window.scrollX,
                width: parentRect.width,
                zIndex: 9999
            });
        }
    }, [parentRef, dropdownRef]);

    return ReactDOM.createPortal(
        <div ref={dropdownRef} style={styles} className="select-dropdown-portal">
            {children}
        </div>,
        document.body
    );
};

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = "Search...", 
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const dropdownRef = useRef(null);
    const headerRef = useRef(null);

    useEffect(() => {
        const filtered = options.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOptions(filtered);
    }, [searchTerm, options]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                headerRef.current && !headerRef.current.contains(event.target) &&
                (!dropdownRef.current || !dropdownRef.current.contains(event.target))
            ) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                setSearchTerm('');
            }
        }
    };

    const displayValue = value || placeholder;

    return (
        <div className={`searchable-select ${className}`} ref={headerRef}>
            <div 
                className={`select-header ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={handleToggle}
            >
                <span className="select-value">{displayValue}</span>
                <svg 
                    className="select-arrow" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                >
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            </div>
            {isOpen && (
                <DropdownPortal parentRef={headerRef}>
                    <div className="select-dropdown" ref={dropdownRef}>
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                            autoFocus
                        />
                    </div>
                    <div className="options-container">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={index}
                                    className={`option ${option === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="no-options">No countries found</div>
                        )}
                    </div>
                </div>
                </DropdownPortal>
            )}
        </div>
    );
};

export default SearchableSelect; 