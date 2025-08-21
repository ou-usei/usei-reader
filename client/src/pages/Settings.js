import React from 'react';

const Settings = ({ users, currentUser, onUserChange }) => {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your application settings.</p>
      </header>

      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">User Settings</h2>
        {currentUser && (
          <div className="flex items-center space-x-4">
            <span className="font-medium">Current User:</span>
            <select 
              onChange={onUserChange} 
              value={currentUser.username} 
              className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
            >
              {users.map(user => (
                <option key={user.username} value={user.username}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
