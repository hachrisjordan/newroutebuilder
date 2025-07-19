"use client";
import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { getAirlineLogoSrc } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { AircraftConfig, TailNumber, AircraftType } from "@/types/admin";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface ConfigFormData {
  airline: string;
  type: string;
  variant: string;
  config: string;
  note: string;
  color: string;
}

interface TailFormData {
  airline: string;
  tail: string;
  type: string;
  variant: string;
  name: string;
  effective_date: string;
  end_date: string;
}

interface Airline {
  code: string;
  name: string;
}

const AircraftConfigTab = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [selectedAirline, setSelectedAirline] = useState<string | undefined>();
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([]);
  const [tailNumbers, setTailNumbers] = useState<TailNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  
  // Airline selector states
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Form airline selector states
  const [configAirlineSearch, setConfigAirlineSearch] = useState('');
  const [configAirlineDisplay, setConfigAirlineDisplay] = useState('');
  const [configAirlineDropdown, setConfigAirlineDropdown] = useState(false);
  const [tailAirlineSearch, setTailAirlineSearch] = useState('');
  const [tailAirlineDisplay, setTailAirlineDisplay] = useState('');
  const [tailAirlineDropdown, setTailAirlineDropdown] = useState(false);
  
  // Collapsible section states
  const [configSectionExpanded, setConfigSectionExpanded] = useState(true);
  const [tailSectionExpanded, setTailSectionExpanded] = useState(true);
  
  // Search and pagination states
  const [configSearchTerm, setConfigSearchTerm] = useState('');
  const [tailSearchTerm, setTailSearchTerm] = useState('');
  const [configCurrentPage, setConfigCurrentPage] = useState(1);
  const [tailCurrentPage, setTailCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form states
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showTailForm, setShowTailForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AircraftConfig | null>(null);
  const [editingTail, setEditingTail] = useState<TailNumber | null>(null);
  
  const [configForm, setConfigForm] = useState<ConfigFormData>({
    airline: "",
    type: "",
    variant: "",
    config: "",
    note: "",
    color: "#000000"
  });
  
  const [tailForm, setTailForm] = useState<TailFormData>({
    airline: "",
    tail: "",
    type: "",
    variant: "",
    name: "",
    effective_date: "",
    end_date: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    
    try {
      // Fetch airlines that have configurations in the config table
      const { data: configAirlines } = await supabase
        .from('config')
        .select('airline')
        .order('airline');
      
      // Get unique airline codes from config table
      const uniqueAirlineCodes = [...new Set(configAirlines?.map(c => c.airline) || [])];
      
      // Fetch airline details for those codes
      const { data: airlinesData } = await supabase
        .from('airlines')
        .select('code, name')
        .in('code', uniqueAirlineCodes)
        .order('name');
      
      const airlineList = airlinesData?.map(a => ({ code: a.code, name: a.name })) || [];
      setAirlines(airlineList);
    } catch (error) {
      console.error('Error fetching airlines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAirlineData = async (airlineCode: string) => {
    const supabase = createSupabaseBrowserClient();
    
    try {
      // Fetch configurations for selected airline
      const { data: configsData } = await supabase
        .from('config')
        .select('*')
        .eq('airline', airlineCode)
        .order('type, variant');

      // Fetch tail numbers for selected airline
      const { data: tailsData } = await supabase
        .from('tail')
        .select('*')
        .eq('airline', airlineCode)
        .order('tail');

      // Group configurations by type
      const groupedConfigs = configsData?.reduce((acc, config) => {
        if (!acc[config.type]) {
          acc[config.type] = [];
        }
        acc[config.type].push(config as AircraftConfig);
        return acc;
      }, {} as Record<string, AircraftConfig[]>) || {};

      const types: AircraftType[] = Object.entries(groupedConfigs).map(([type, variants]) => ({
        airline: airlineCode,
        type,
        variants: variants as AircraftConfig[]
      }));

      setAircraftTypes(types);
      setTailNumbers(tailsData || []);
    } catch (error) {
      console.error('Error fetching airline data:', error);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch airline data when airline is selected
  useEffect(() => {
    if (selectedAirline) {
      fetchAirlineData(selectedAirline);
    } else {
      setAircraftTypes([]);
      setTailNumbers([]);
    }
  }, [selectedAirline]);

  const toggleTypeExpansion = (typeKey: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeKey)) {
      newExpanded.delete(typeKey);
    } else {
      newExpanded.add(typeKey);
    }
    setExpandedTypes(newExpanded);
  };

  const filteredAirlines = airlines.filter(airline => {
    const searchLower = searchTerm.toLowerCase();
    return airline.code.toLowerCase().includes(searchLower) || 
           airline.name.toLowerCase().includes(searchLower);
  });

  // Filter configurations by search term
  const filteredConfigs = aircraftTypes.flatMap(typeGroup => 
    typeGroup.variants.filter(variant => {
      const searchLower = configSearchTerm.toLowerCase();
      return variant.type.toLowerCase().includes(searchLower) ||
             variant.variant.toLowerCase().includes(searchLower) ||
             variant.note.toLowerCase().includes(searchLower);
    })
  );

  // Filter tail numbers by search term
  const filteredTails = tailNumbers.filter(tail => {
    const searchLower = tailSearchTerm.toLowerCase();
    return tail.tail.toLowerCase().includes(searchLower) ||
           tail.name.toLowerCase().includes(searchLower) ||
           tail.type.toLowerCase().includes(searchLower);
  });

  // Pagination calculations
  const configTotalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
  const tailTotalPages = Math.ceil(filteredTails.length / itemsPerPage);
  
  const configStartIndex = (configCurrentPage - 1) * itemsPerPage;
  const configEndIndex = configStartIndex + itemsPerPage;
  const paginatedConfigs = filteredConfigs.slice(configStartIndex, configEndIndex);
  
  const tailStartIndex = (tailCurrentPage - 1) * itemsPerPage;
  const tailEndIndex = tailStartIndex + itemsPerPage;
  const paginatedTails = filteredTails.slice(tailStartIndex, tailEndIndex);

  // Get available types for the selected airline in tail form
  const availableTypes = aircraftTypes
    .filter(typeGroup => typeGroup.airline === tailForm.airline)
    .map(typeGroup => typeGroup.type);

  // Get available variants for the selected type in tail form
  const availableVariants = aircraftTypes
    .filter(typeGroup => typeGroup.airline === tailForm.airline && typeGroup.type === tailForm.type)
    .flatMap(typeGroup => typeGroup.variants)
    .map((variant: AircraftConfig) => ({ value: variant.variant, label: `${variant.note} - ${variant.config}` }));

  const handleConfigSubmit = async () => {
    // Validate required fields
    if (!configForm.airline || !configForm.type || !configForm.variant || !configForm.config || !configForm.note) {
      showError(
        "Validation Error", 
        "Please fill in all required fields: Airline, Type, Variant, Configuration, and Note"
      );
      return;
    }
    
    const supabase = createSupabaseBrowserClient();
    
    try {
      if (editingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('config')
          .update({
            airline: configForm.airline,
            type: configForm.type,
            variant: configForm.variant,
            config: configForm.config,
            note: configForm.note,
            color: configForm.color
          })
          .eq('id', editingConfig.id);
        
        if (error) throw error;
        
        showSuccess(
          "Configuration Updated", 
          `Successfully updated ${configForm.variant} configuration for ${configForm.airline}`
        );
      } else {
        // Create new config
        const { error } = await supabase
          .from('config')
          .insert([{
            airline: configForm.airline,
            type: configForm.type,
            variant: configForm.variant,
            config: configForm.config,
            note: configForm.note,
            color: configForm.color
          }]);
        
        if (error) throw error;
        
        showSuccess(
          "Configuration Added", 
          `Successfully added ${configForm.variant} configuration for ${configForm.airline}`
        );
      }
      
      setShowConfigForm(false);
      setEditingConfig(null);
      setConfigForm({
        airline: "",
        type: "",
        variant: "",
        config: "",
        note: "",
        color: "#000000"
      });
      if (selectedAirline) {
        fetchAirlineData(selectedAirline);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showError(
        "Configuration Error", 
        editingConfig 
          ? `Failed to update configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
          : `Failed to add configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleTailSubmit = async () => {
    // Validate required fields
    if (!tailForm.airline || !tailForm.tail || !tailForm.type || !tailForm.variant) {
      showError(
        "Validation Error", 
        "Please fill in all required fields: Airline, Tail Number, Aircraft Type, and Variant"
      );
      return;
    }
    
    const supabase = createSupabaseBrowserClient();
    
    try {
      if (editingTail) {
        // Update existing tail
        const { error } = await supabase
          .from('tail')
          .update({
            airline: tailForm.airline,
            tail: tailForm.tail,
            type: tailForm.type,
            variant: tailForm.variant,
            name: tailForm.name,
            effective_date: tailForm.effective_date,
            end_date: tailForm.end_date
          })
          .eq('id', editingTail.id);
        
        if (error) throw error;
        
        showSuccess(
          "Tail Number Updated", 
          `Successfully updated tail number ${tailForm.tail} for ${tailForm.airline}`
        );
      } else {
        // Create new tail
        const { error } = await supabase
          .from('tail')
          .insert([{
            airline: tailForm.airline,
            tail: tailForm.tail,
            type: tailForm.type,
            variant: tailForm.variant,
            name: tailForm.name,
            effective_date: tailForm.effective_date,
            end_date: tailForm.end_date
          }]);
        
        if (error) throw error;
        
        showSuccess(
          "Tail Number Added", 
          `Successfully added tail number ${tailForm.tail} for ${tailForm.airline}`
        );
      }
      
      setShowTailForm(false);
      setEditingTail(null);
      setTailForm({
        airline: "",
        tail: "",
        type: "",
        variant: "",
        name: "",
        effective_date: "",
        end_date: ""
      });
      if (selectedAirline) {
        fetchAirlineData(selectedAirline);
      }
    } catch (error) {
      console.error('Error saving tail:', error);
      showError(
        "Tail Number Error", 
        editingTail 
          ? `Failed to update tail number: ${error instanceof Error ? error.message : 'Unknown error'}`
          : `Failed to add tail number: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleDeleteConfig = async (config: AircraftConfig) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    
    const supabase = createSupabaseBrowserClient();
    try {
      const { error } = await supabase
        .from('config')
        .delete()
        .eq('id', config.id);
      
      if (error) throw error;
      
      showSuccess(
        "Configuration Deleted", 
        `Successfully deleted ${config.variant} configuration for ${config.airline}`
      );
      
      if (selectedAirline) {
        fetchAirlineData(selectedAirline);
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      showError(
        "Delete Error", 
        `Failed to delete configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleDeleteTail = async (tail: TailNumber) => {
    if (!confirm('Are you sure you want to delete this tail number?')) return;
    
    const supabase = createSupabaseBrowserClient();
    try {
      const { error } = await supabase
        .from('tail')
        .delete()
        .eq('id', tail.id);
      
      if (error) throw error;
      
      showSuccess(
        "Tail Number Deleted", 
        `Successfully deleted tail number ${tail.tail} for ${tail.airline}`
      );
      
      if (selectedAirline) {
        fetchAirlineData(selectedAirline);
      }
    } catch (error) {
      console.error('Error deleting tail:', error);
      showError(
        "Delete Error", 
        `Failed to delete tail number: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const editConfig = (config: AircraftConfig) => {
    setEditingConfig(config);
    setConfigForm({
      airline: config.airline,
      type: config.type,
      variant: config.variant,
      config: config.config,
      note: config.note,
      color: config.color
    });
    setShowConfigForm(true);
  };

  const addConfig = () => {
    if (selectedAirline) {
      setConfigForm({
        airline: selectedAirline,
        type: "",
        variant: "",
        config: "",
        note: "",
        color: "#000000"
      });
    }
    setShowConfigForm(true);
  };

  const editTail = (tail: TailNumber) => {
    setEditingTail(tail);
    setTailForm({
      airline: tail.airline,
      tail: tail.tail,
      type: tail.type,
      variant: tail.variant || "",
      name: tail.name,
      effective_date: tail.effective_date,
      end_date: tail.end_date
    });
    setShowTailForm(true);
  };

  const addTail = () => {
    if (selectedAirline) {
      setTailForm({
        airline: selectedAirline,
        tail: "",
        type: "",
        variant: "",
        name: "",
        effective_date: "",
        end_date: ""
      });
    }
    setShowTailForm(true);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Airline Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Select Airline</CardTitle>
            {airlines.length === 0 && !isLoading ? (
              <div className="text-muted-foreground text-sm">
                No airlines with configurations found. Add configurations to airlines to see them here.
              </div>
            ) : (
              <div className="flex-1 max-w-[270px]" ref={dropdownRef}>
              <div className="relative">
                {selectedAirline ? (
                  <div 
                    className="h-8 pl-8 pr-8 flex items-center border rounded-md bg-background/50 text-sm cursor-text relative dark:bg-background/80 dark:border-border/50"
                    onClick={() => setShowDropdown(true)}
                  >
                    <Image
                      src={getAirlineLogoSrc(selectedAirline || '', isDark)}
                      alt={airlines.find(a => a.code === selectedAirline)?.name || ''}
                      width={20}
                      height={20}
                      className="absolute left-2 top-1/2 -translate-y-1/2 object-contain rounded-[4px]"
                      unoptimized
                    />
                    <span className="block sm:hidden font-bold">{selectedAirline}</span>
                    <span className="hidden sm:block dark:text-foreground/90">
                      {airlines.find(a => a.code === selectedAirline)?.name} - <span className="font-bold">{selectedAirline}</span>
                    </span>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 rounded-sm touch-manipulation select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAirline(undefined);
                        setDisplayValue('');
                        setSearchTerm('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Input
                    type="text"
                    placeholder={isLoading ? "Loading..." : "Select airline..."}
                    value={displayValue}
                    onChange={(e) => {
                      setDisplayValue(e.target.value);
                      setSearchTerm(e.target.value);
                      setSelectedAirline(undefined);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="h-8 pl-8"
                    disabled={isLoading}
                  />
                )}
              </div>
              {showDropdown && !isLoading && (
                <div className="absolute z-10 mt-1 max-h-60 w-[300px] overflow-auto rounded-md bg-popover/95 dark:bg-popover/90 py-1 shadow-lg border dark:border-border/50">
                  {filteredAirlines.length > 0 ? (
                    filteredAirlines.map((airline) => (
                      <div
                        key={airline.code}
                        className="flex items-center gap-2 px-2 py-1.5 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
                        onClick={() => {
                          setSelectedAirline(airline.code);
                          const selectedAirlineName = airlines.find(a => a.code === airline.code)?.name || '';
                          setDisplayValue(`${selectedAirlineName} - ${airline.code}`);
                          setSearchTerm('');
                          setShowDropdown(false);
                        }}
                      >
                        <Image
                          src={getAirlineLogoSrc(airline.code, isDark)}
                          alt={airline.name}
                          width={20}
                          height={20}
                          className="object-contain rounded-[4px]"
                          unoptimized
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{airline.name} - <span className="font-bold">{airline.code}</span></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No airlines found</div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </CardHeader>
      </Card>

      {/* Aircraft Configurations */}
      {selectedAirline && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfigSectionExpanded(!configSectionExpanded)}
                className="p-1 h-auto"
              >
                {configSectionExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              <CardTitle>Aircraft Configurations - {selectedAirline}</CardTitle>
            </div>
            <Button onClick={addConfig}>
              <Plus className="w-4 h-4 mr-2" />
              Add Configuration
            </Button>
          </CardHeader>
          {configSectionExpanded && (
            <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <Input
                placeholder="Search configurations by type, variant, or note..."
                value={configSearchTerm}
                onChange={(e) => {
                  setConfigSearchTerm(e.target.value);
                  setConfigCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full"
              />
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {filteredConfigs.length} configuration{filteredConfigs.length !== 1 ? 's' : ''} found
            </div>

            {/* Configurations List */}
            <div className="space-y-2">
              {paginatedConfigs.length > 0 ? (
                paginatedConfigs.map(variant => (
                  <div key={variant.id} className="p-3 border rounded flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: variant.color }}
                      />
                      <span className="font-mono">{variant.variant}</span>
                      <Badge variant="secondary">{variant.note}</Badge>
                      <span className="text-sm text-muted-foreground">({variant.type})</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editConfig(variant)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteConfig(variant)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {configSearchTerm ? 'No configurations found matching your search.' : 'No configurations found.'}
                </div>
              )}
            </div>

            {/* Pagination */}
            {configTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {configCurrentPage} of {configTotalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfigCurrentPage(Math.max(1, configCurrentPage - 1))}
                    disabled={configCurrentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfigCurrentPage(Math.min(configTotalPages, configCurrentPage + 1))}
                    disabled={configCurrentPage === configTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          )}
        </Card>
      )}

      {/* Tail Numbers */}
      {selectedAirline && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTailSectionExpanded(!tailSectionExpanded)}
                className="p-1 h-auto"
              >
                {tailSectionExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              <CardTitle>Tail Numbers - {selectedAirline}</CardTitle>
            </div>
            <Button onClick={addTail}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tail Number
            </Button>
          </CardHeader>
          {tailSectionExpanded && (
            <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <Input
                placeholder="Search tail numbers by tail, name, or type..."
                value={tailSearchTerm}
                onChange={(e) => {
                  setTailSearchTerm(e.target.value);
                  setTailCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full"
              />
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {filteredTails.length} tail number{filteredTails.length !== 1 ? 's' : ''} found
            </div>

            {/* Tail Numbers List */}
            <div className="space-y-2">
              {paginatedTails.length > 0 ? (
                paginatedTails.map(tail => (
                  <div key={tail.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <span className="font-mono font-medium">{tail.tail}</span>
                      <span className="ml-2">{tail.name}</span>
                      <Badge variant="outline" className="ml-2">{tail.type}</Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editTail(tail)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTail(tail)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {tailSearchTerm ? 'No tail numbers found matching your search.' : 'No tail numbers found.'}
                </div>
              )}
            </div>

            {/* Pagination */}
            {tailTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {tailCurrentPage} of {tailTotalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTailCurrentPage(Math.max(1, tailCurrentPage - 1))}
                    disabled={tailCurrentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTailCurrentPage(Math.min(tailTotalPages, tailCurrentPage + 1))}
                    disabled={tailCurrentPage === tailTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          )}
        </Card>
      )}

      {/* Configuration Form Modal */}
      {showConfigForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingConfig ? 'Edit Configuration' : 'Add Configuration'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="config-airline" className="block text-sm font-medium mb-2">Airline</label>
                <div className="relative">
                  <div className="relative">
                    {configForm.airline ? (
                      <div 
                        className="h-10 pl-8 pr-8 flex items-center border rounded-md bg-background/50 text-sm cursor-text relative dark:bg-background/80 dark:border-border/50"
                        onClick={() => setConfigAirlineDropdown(true)}
                      >
                        <Image
                          src={getAirlineLogoSrc(configForm.airline || '', isDark)}
                          alt={airlines.find(a => a.code === configForm.airline)?.name || ''}
                          width={20}
                          height={20}
                          className="absolute left-2 top-1/2 -translate-y-1/2 object-contain rounded-[4px]"
                          unoptimized
                        />
                        <span className="block sm:hidden font-bold">{configForm.airline}</span>
                        <span className="hidden sm:block dark:text-foreground/90">
                          {airlines.find(a => a.code === configForm.airline)?.name} - <span className="font-bold">{configForm.airline}</span>
                        </span>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 rounded-sm touch-manipulation select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfigForm({...configForm, airline: ""});
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder="Select airline..."
                        value={configAirlineDisplay}
                        onChange={(e) => {
                          setConfigAirlineDisplay(e.target.value);
                          setConfigAirlineSearch(e.target.value);
                          setConfigForm({...configForm, airline: ""});
                          setConfigAirlineDropdown(true);
                        }}
                        onFocus={() => setConfigAirlineDropdown(true)}
                        className="h-10 pl-8"
                      />
                    )}
                  </div>
                  {configAirlineDropdown && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover/95 dark:bg-popover/90 py-1 shadow-lg border dark:border-border/50">
                      {airlines.filter(airline => {
                        const searchLower = configAirlineSearch.toLowerCase();
                        return airline.code.toLowerCase().includes(searchLower) || 
                               airline.name.toLowerCase().includes(searchLower);
                      }).length > 0 ? (
                        airlines.filter(airline => {
                          const searchLower = configAirlineSearch.toLowerCase();
                          return airline.code.toLowerCase().includes(searchLower) || 
                                 airline.name.toLowerCase().includes(searchLower);
                        }).map((airline) => (
                          <div
                            key={airline.code}
                            className="flex items-center gap-2 px-2 py-1.5 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
                            onClick={() => {
                              setConfigForm({...configForm, airline: airline.code});
                              const selectedAirlineName = airlines.find(a => a.code === airline.code)?.name || '';
                              setConfigAirlineDisplay(`${selectedAirlineName} - ${airline.code}`);
                              setConfigAirlineSearch('');
                              setConfigAirlineDropdown(false);
                            }}
                          >
                            <Image
                              src={getAirlineLogoSrc(airline.code, isDark)}
                              alt={airline.name}
                              width={20}
                              height={20}
                              className="object-contain rounded-[4px]"
                              unoptimized
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">{airline.name} - <span className="font-bold">{airline.code}</span></span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No airlines found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-2">Type</label>
                <Input
                  id="type"
                  value={configForm.type}
                  onChange={(e) => setConfigForm({...configForm, type: e.target.value})}
                  placeholder="e.g., 787, A350"
                />
              </div>
              <div>
                <label htmlFor="variant" className="block text-sm font-medium mb-2">Variant</label>
                <Input
                  id="variant"
                  value={configForm.variant}
                  onChange={(e) => setConfigForm({...configForm, variant: e.target.value})}
                  placeholder="e.g., 787-9, A350-900"
                />
              </div>
              <div>
                <label htmlFor="config" className="block text-sm font-medium mb-2">Configuration</label>
                <Input
                  id="config"
                  value={configForm.config}
                  onChange={(e) => setConfigForm({...configForm, config: e.target.value})}
                  placeholder="e.g., 3-3-3, 2-4-2"
                />
              </div>
              <div>
                <label htmlFor="note" className="block text-sm font-medium mb-2">Note</label>
                <Input
                  id="note"
                  value={configForm.note}
                  onChange={(e) => setConfigForm({...configForm, note: e.target.value})}
                  placeholder="e.g., Standard Economy"
                />
              </div>
              <div>
                <label htmlFor="color" className="block text-sm font-medium mb-2">Color</label>
                <Input
                  id="color"
                  type="color"
                  value={configForm.color}
                  onChange={(e) => setConfigForm({...configForm, color: e.target.value})}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleConfigSubmit} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowConfigForm(false);
                    setEditingConfig(null);
                    setConfigForm({
                      airline: "",
                      type: "",
                      variant: "",
                      config: "",
                      note: "",
                      color: "#000000"
                    });
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tail Number Form Modal */}
      {showTailForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingTail ? 'Edit Tail Number' : 'Add Tail Number'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="tail-airline" className="block text-sm font-medium mb-2">Airline *</label>
                <div className="relative">
                  <div className="relative">
                    {tailForm.airline ? (
                      <div 
                        className="h-10 pl-8 pr-8 flex items-center border rounded-md bg-background/50 text-sm cursor-text relative dark:bg-background/80 dark:border-border/50"
                        onClick={() => setTailAirlineDropdown(true)}
                      >
                        <Image
                          src={getAirlineLogoSrc(tailForm.airline || '', isDark)}
                          alt={airlines.find(a => a.code === tailForm.airline)?.name || ''}
                          width={20}
                          height={20}
                          className="absolute left-2 top-1/2 -translate-y-1/2 object-contain rounded-[4px]"
                          unoptimized
                        />
                        <span className="block sm:hidden font-bold">{tailForm.airline}</span>
                        <span className="hidden sm:block dark:text-foreground/90">
                          {airlines.find(a => a.code === tailForm.airline)?.name} - <span className="font-bold">{tailForm.airline}</span>
                        </span>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 rounded-sm touch-manipulation select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTailForm({...tailForm, airline: ""});
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder="Select airline..."
                        value={tailAirlineDisplay}
                        onChange={(e) => {
                          setTailAirlineDisplay(e.target.value);
                          setTailAirlineSearch(e.target.value);
                          setTailForm({...tailForm, airline: ""});
                          setTailAirlineDropdown(true);
                        }}
                        onFocus={() => setTailAirlineDropdown(true)}
                        className="h-10 pl-8"
                      />
                    )}
                  </div>
                  {tailAirlineDropdown && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover/95 dark:bg-popover/90 py-1 shadow-lg border dark:border-border/50">
                      {airlines.filter(airline => {
                        const searchLower = tailAirlineSearch.toLowerCase();
                        return airline.code.toLowerCase().includes(searchLower) || 
                               airline.name.toLowerCase().includes(searchLower);
                      }).length > 0 ? (
                        airlines.filter(airline => {
                          const searchLower = tailAirlineSearch.toLowerCase();
                          return airline.code.toLowerCase().includes(searchLower) || 
                                 airline.name.toLowerCase().includes(searchLower);
                        }).map((airline) => (
                          <div
                            key={airline.code}
                            className="flex items-center gap-2 px-2 py-1.5 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
                            onClick={() => {
                              setTailForm({...tailForm, airline: airline.code});
                              const selectedAirlineName = airlines.find(a => a.code === airline.code)?.name || '';
                              setTailAirlineDisplay(`${selectedAirlineName} - ${airline.code}`);
                              setTailAirlineSearch('');
                              setTailAirlineDropdown(false);
                            }}
                          >
                            <Image
                              src={getAirlineLogoSrc(airline.code, isDark)}
                              alt={airline.name}
                              width={20}
                              height={20}
                              className="object-contain rounded-[4px]"
                              unoptimized
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">{airline.name} - <span className="font-bold">{airline.code}</span></span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No airlines found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="tail-number" className="block text-sm font-medium mb-2">Tail Number *</label>
                <Input
                  id="tail-number"
                  value={tailForm.tail}
                  onChange={(e) => setTailForm({...tailForm, tail: e.target.value})}
                  placeholder="e.g., N12345"
                />
              </div>
              <div>
                <label htmlFor="tail-type" className="block text-sm font-medium mb-2">Aircraft Type *</label>
                <select
                  id="tail-type"
                  value={tailForm.type}
                  onChange={(e) => {
                    setTailForm({...tailForm, type: e.target.value, variant: ""});
                  }}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Aircraft Type</option>
                  {availableTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tail-variant" className="block text-sm font-medium mb-2">Variant (Note - Config) *</label>
                <select
                  id="tail-variant"
                  value={tailForm.variant}
                  onChange={(e) => setTailForm({...tailForm, variant: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                  disabled={!tailForm.type}
                >
                  <option value="">Select Variant</option>
                  {availableVariants.map(variant => (
                    <option key={variant.value} value={variant.value}>{variant.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tail-name" className="block text-sm font-medium mb-2">Name</label>
                <Input
                  id="tail-name"
                  value={tailForm.name}
                  onChange={(e) => setTailForm({...tailForm, name: e.target.value})}
                  placeholder="e.g., Dreamliner"
                />
              </div>
              <div>
                <label htmlFor="effective-date" className="block text-sm font-medium mb-2">Effective Date</label>
                <Input
                  id="effective-date"
                  type="date"
                  value={tailForm.effective_date}
                  onChange={(e) => setTailForm({...tailForm, effective_date: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium mb-2">End Date</label>
                <Input
                  id="end-date"
                  type="date"
                  value={tailForm.end_date}
                  onChange={(e) => setTailForm({...tailForm, end_date: e.target.value})}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleTailSubmit} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowTailForm(false);
                    setEditingTail(null);
                    setTailForm({
                      airline: "",
                      tail: "",
                      type: "",
                      variant: "",
                      name: "",
                      effective_date: "",
                      end_date: ""
                    });
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AircraftConfigTab; 