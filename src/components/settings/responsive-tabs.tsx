"use client";
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';

const AircraftConfigTab = dynamic(() => import('@/components/settings/aircraft-config-tab'), { ssr: false });
const UserManagementTab = dynamic(() => import('@/components/settings/user-management-tab'), { ssr: false });

const ResponsiveTabs = () => {
  const [activeTab, setActiveTab] = useState('aircraft-config');

  return (
    <div className="w-full">
      {/* Mobile: Select Box */}
      <div className="block md:hidden mb-6">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a tab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aircraft-config">Aircraft Configuration</SelectItem>
            <SelectItem value="user-management">User Management</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Tabs */}
      <div className="hidden md:block">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="aircraft-config">Aircraft Configuration</TabsTrigger>
            <TabsTrigger value="user-management">User Management</TabsTrigger>
          </TabsList>
          <TabsContent value="aircraft-config" className="mt-6">
            <AircraftConfigTab />
          </TabsContent>
          <TabsContent value="user-management" className="mt-6">
            <UserManagementTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: Content based on selected tab */}
      <div className="block md:hidden">
        {activeTab === 'aircraft-config' && (
          <div className="mt-6">
            <AircraftConfigTab />
          </div>
        )}
        {activeTab === 'user-management' && (
          <div className="mt-6">
            <UserManagementTab />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsiveTabs; 