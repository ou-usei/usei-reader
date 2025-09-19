import React from 'react';
import useAuthStore from '../stores/authStore';
import { Button } from '../components/ui/button';

const Settings = () => {
  const { user, logout } = useAuthStore();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your application settings.</p>
      </header>

      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Account</h2>
        {user && (
          <div className="flex items-center justify-between">
            <p>Logged in as: <span className="font-medium">{user.email}</span></p>
            <Button variant="destructive" onClick={logout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
