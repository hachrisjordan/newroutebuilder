"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, Search, Users, User } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
  };
  role: string;
}

interface EditingUser {
  id: string;
  role: string;
}

const UserManagementTab = () => {
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );

      setEditingUser(null);
      showSuccess('Role Updated', `Successfully updated user role to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      showError('Update Error', error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const startEditing = (user: User) => {
    setEditingUser({
      id: user.id,
      role: user.role
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'default';
      case 'Pro':
        return 'secondary';
      case 'User':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Pro':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'User':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return user.email.toLowerCase().includes(searchLower) ||
           (user.user_metadata?.name || '').toLowerCase().includes(searchLower) ||
           user.role.toLowerCase().includes(searchLower);
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  if (isLoading) {
    return <div className="text-center py-4">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h2 className="text-lg font-semibold">User Management</h2>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search users by name, email, or role..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page when searching
          }}
          className="pl-10"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {paginatedUsers.length > 0 ? (
          paginatedUsers.map(user => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {user.user_metadata?.name || 'No name'}
                    </span>
                    <Badge 
                      variant={getRoleBadgeVariant(user.role) as any}
                      className={getRoleColor(user.role)}
                    >
                      {user.role}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {editingUser?.id === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          role: e.target.value
                        })}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="User">User</option>
                        <option value="Pro">Pro</option>
                        <option value="Owner">Owner</option>
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleRoleUpdate(user.id, editingUser.role)}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(user)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Role
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No users found matching your search.' : 'No users found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab; 