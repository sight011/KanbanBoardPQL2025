import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const DueDate = ({ duedate, setDuedate }) => {
    const [selectedDate, setSelectedDate] = useState(duedate ? new Date(duedate) : null);

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setDuedate(date ? date.toISOString() : null);
    };

    const CustomInput = forwardRef(({ value, onClick }, ref) => (
        <button className="due-date-custom-input" onClick={onClick} ref={ref}>
            {value || "Select Date"}
        </button>
    ));

    return (
        <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            customInput={<CustomInput />}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMM d, yyyy h:mm aa"
            popperPlacement="top-end"
        />
    );
};

export default DueDate; 