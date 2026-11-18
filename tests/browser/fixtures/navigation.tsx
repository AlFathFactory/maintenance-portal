import React from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Link, RouterProvider } from 'react-router-dom';
import { useUnsavedWarning } from '../../../src/features/hse/inspections/useUnsavedWarning';

function Edit() {
  const [value, setValue] = React.useState('');
  useUnsavedWarning(value.length > 0, 'Leave unsaved inspection?');
  return (
    <main>
      <label>
        Answer
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <Link to="/next">Next page</Link>
    </main>
  );
}

const router = createHashRouter([
  { path: '/edit', element: <Edit /> },
  {
    path: '/next',
    element: (
      <main>
        Next page <Link to="/edit">Edit inspection</Link>
      </main>
    ),
  },
]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
