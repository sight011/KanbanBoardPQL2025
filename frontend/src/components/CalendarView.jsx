// import React, { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PropTypes from 'prop-types';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const colorPalette = [
  '#1976d2', // blue
  '#388e3c', // green
  '#fbc02d', // yellow
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#0288d1', // light blue
  '#c2185b', // pink
  '#ffa000', // orange
  '#388e3c', // dark green
  '#455a64', // blue grey
];

const placeholderEvents = [
  {
    title: 'Task 1',
    start: new Date(),
    end: new Date(),
    allDay: true,
    color: '#90caf9',
  },
  {
    title: 'Bug Fix',
    start: new Date(new Date().setDate(new Date().getDate() + 2)),
    end: new Date(new Date().setDate(new Date().getDate() + 2)),
    allDay: true,
    color: '#ffcc80',
  },
  {
    title: 'Feature Planning',
    start: new Date(new Date().setDate(new Date().getDate() + 5)),
    end: new Date(new Date().setDate(new Date().getDate() + 5)),
    allDay: true,
    color: '#b39ddb',
  },
];

const CalendarView = ({ onSprintDoubleClick }) => {
  const [sprintEvents, setSprintEvents] = useState([]);

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const res = await fetch('/api/sprints');
        const data = await res.json();
        if (data.sprints) {
          const events = data.sprints.map((sprint, idx) => ({
            id: sprint.id,
            title: sprint.name,
            start: sprint.start_date ? new Date(sprint.start_date) : null,
            end: sprint.end_date ? new Date(sprint.end_date) : null,
            allDay: true,
            color: colorPalette[idx % colorPalette.length],
          })).filter(e => e.start && e.end);
          
          // Add a special "Backlog" event
          const backlogEvent = {
            id: 'backlog',
            title: '📋 Backlog',
            start: new Date(),
            end: new Date(),
            allDay: true,
            color: '#6c757d', // gray color for backlog
          };
          
          setSprintEvents([...events, backlogEvent]);
        }
      } catch (err) {
        setSprintEvents([]);
      }
    };
    fetchSprints();
  }, []);

  // Merge sprints and placeholder events
  const allEvents = [...sprintEvents, ...placeholderEvents];

  // Custom event style getter
  const eventPropGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color || '#1976d2',
        color: '#fff',
        borderRadius: '4px',
        border: 'none',
        padding: '2px 6px',
        fontWeight: 500,
      },
    };
  };

  // Double click handler
  const handleDoubleClickEvent = (event) => {
    if (event.id && onSprintDoubleClick) {
      onSprintDoubleClick(event.id);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', width: '100%', background: '#fff', padding: 16 }}>
      <Calendar
        localizer={localizer}
        events={allEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', minHeight: 500 }}
        views={['month', 'week', 'day']}
        defaultView="month"
        popup
        eventPropGetter={eventPropGetter}
        onDoubleClickEvent={handleDoubleClickEvent}
      />
    </div>
  );
};

CalendarView.propTypes = {
  onSprintDoubleClick: PropTypes.func,
};

export default CalendarView; 