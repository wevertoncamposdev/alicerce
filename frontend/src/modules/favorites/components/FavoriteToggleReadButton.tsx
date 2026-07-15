'use client';

import { useState } from 'react';

export function FavoriteToggleReadButton() {
    const [clicked, setClicked] = useState(false);

    return (
        <button className={`ml-4 px-3 py-1 rounded-md text-white ${clicked ? 'bg-green-500' : 'bg-blue-500'}`}
            onClick={() => setClicked(!clicked)}>
            {clicked ? 'Marcado' : 'Marcar'}
        </button>
    );
}