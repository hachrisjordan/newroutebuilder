import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Award Finder Wiki - bbairtools',
  description: 'Complete guide to using the Award Finder tool for finding award flight availability',
}

export default function AwardFinderWikiPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold mb-8">Award Finder Wiki 🛫</h1>
        
        {/* Table of Contents */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Table of Contents</h2>
          <ul className="space-y-2">
            <li><a href="#overview" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Overview</a></li>
            <li><a href="#getting-started" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Getting Started</a></li>
            <li><a href="#search-interface" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Search Interface</a></li>
            <li><a href="#understanding-results" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Understanding Results</a></li>
            <li><a href="#filters-and-sorting" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Filters and Sorting</a></li>
            <li><a href="#tips-and-strategies" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Tips and Strategies</a></li>
            <li><a href="#troubleshooting" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Troubleshooting</a></li>
            <li><a href="#quick-reference" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Quick Reference</a></li>
            <li><a href="#important-notes" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Important Notes</a></li>
          </ul>
        </div>

        {/* Overview Section */}
        <section id="overview" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Overview</h2>
          <p className="mb-4">
            The <strong>Award Finder</strong> is a powerful tool that helps you discover available award flights across multiple airlines and routes. It searches through availability data to find award seat availability for your desired travel dates and routes.
          </p>
          
          <h3 className="text-2xl font-semibold mb-4">Key Features</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Multi-airport search</strong>: Search multiple origins and destinations simultaneously</li>
            <li><strong>Date range flexibility</strong>: Search across multiple dates at once</li>
            <li><strong>Reliability filtering</strong>: Focus on flights with better award value</li>
            <li><strong>Mixed cabin support</strong>: Find itineraries with different cabin classes</li>
            <li><strong>Visual indicators</strong>: Easy-to-understand symbols and color coding</li>
          </ul>
        </section>

        {/* Getting Started Section */}
        <section id="getting-started" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Getting Started</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Prerequisites</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Free users</strong>: Limited to 4 origin-destination combinations and 2 stops maximum</li>
            <li><strong>seats.aero Pro users</strong>: Up to 9 combinations, 4 stops maximum, and longer date ranges</li>
            <li><strong>API key requirement</strong>: You must be a seats.aero Pro user with your own API key to unlock advanced features</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Basic Search Setup</h3>
          
          <h4 className="text-xl font-semibold mb-3">Origin and Destination</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Origin</strong>: Enter your departure airport(s) - you can search multiple airports at once</li>
            <li><strong>Destination</strong>: Enter your arrival airport(s) - you can search multiple airports at once</li>
            <li>Use airport codes (e.g., JFK, LAX) or full airport names</li>
            <li>The tool will automatically suggest airports as you type</li>
          </ul>

          <h4 className="text-xl font-semibold mb-3 mt-6">Date Range</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Select your desired travel dates using the calendar picker</li>
            <li>Choose a date range for when you want to travel</li>
            <li>The tool will search for availability across all dates in your selected range</li>
          </ul>

          <h4 className="text-xl font-semibold mb-3 mt-6">Number of Seats</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Specify how many award seats you need (default is 1)</li>
            <li>This affects the search results as some flights may have limited availability</li>
          </ul>

          <h4 className="text-xl font-semibold mb-3 mt-6">Maximum Stops</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Choose how many connections you're willing to make (0-4 stops)</li>
            <li>More stops generally mean more routing options but longer travel times</li>
            <li>Free users are limited to 2 stops maximum</li>
          </ul>
        </section>

        {/* Search Interface Section */}
        <section id="search-interface" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Search Interface</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Advanced Search Options</h3>
          
                     <h4 className="text-xl font-semibold mb-3">API Key (Optional)</h4>
           <ul className="list-disc pl-6 space-y-2">
             <li>Enter your seats.aero API key to unlock advanced features</li>
             <li>Advanced features include: longer date ranges, more combinations, and additional search options</li>
           </ul>

          <h4 className="text-xl font-semibold mb-3 mt-6">Reliability Filter</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>"Show reliable flights only"</strong>: Filters out flights that are only available on their own program at high prices</li>
            <li><strong>Reliability percentage</strong>: Set minimum reliability threshold (default 85%)</li>
            <li><strong>What "reliable" means</strong>: These flights are available as saver awards or through partner programs, offering better value for points</li>
            <li><strong>What "unreliable" means</strong>: These flights are only available on the airline's own frequent flyer program at premium prices, not as saver awards</li>
          </ul>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <h5 className="font-semibold text-yellow-800">When to avoid unreliable flights:</h5>
            <ul className="list-disc pl-6 space-y-1 text-yellow-700">
              <li>Often better to pay cash instead of using points at premium rates</li>
              <li>Limited partner booking options</li>
              <li>Higher point costs compared to saver awards</li>
            </ul>
          </div>
        </section>

        {/* Understanding Results Section */}
        <section id="understanding-results" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Understanding Results</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Result Cards</h3>
          <p className="mb-3">Each result card shows:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Route</strong>: Origin → Destination</li>
            <li><strong>Date</strong>: Travel date</li>
            <li><strong>Duration</strong>: Total travel time including layovers</li>
            <li><strong>Stops</strong>: Number of connections</li>
            <li><strong>Flight details</strong>: Expandable list of all flights in the itinerary</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Class Availability Bars</h3>
          <p className="mb-3">The colored bars show award seat availability percentages:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Y (Yellow)</strong>: Economy class availability</li>
            <li><strong>W (Purple)</strong>: Premium Economy availability</li>
            <li><strong>J (Orange)</strong>: Business class availability</li>
            <li><strong>F (Brown)</strong>: First class availability</li>
          </ul>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
            <h5 className="font-semibold text-blue-800">How to read the bars:</h5>
            <ul className="list-disc pl-6 space-y-1 text-blue-700">
              <li>0% = no availability in that class</li>
              <li>100% = full availability</li>
              <li>The bars help you quickly identify which flights have the best award seat availability</li>
            </ul>
          </div>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Mixed Cabin Availability</h3>
          <p className="mb-3">When availability percentages are <strong>not 100%</strong>, this indicates <strong>mixed cabin itineraries</strong>:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Partial availability</strong>: Some flight segments may have different cabin classes</li>
            <li><strong>Example</strong>: An itinerary might show 75% Business class availability, meaning:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>75% of the total flight time is in Business class</li>
                <li>25% of the flight time is in a lower cabin class (Economy or Premium Economy)</li>
              </ul>
            </li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Flight Details</h3>
          <p className="mb-3">When you expand a result, you'll see:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Flight numbers</strong>: All flights in the itinerary</li>
            <li><strong>Departure/Arrival times</strong>: Local times for each segment</li>
            <li><strong>Aircraft type</strong>: Plane model for each flight</li>
            <li><strong>Duration</strong>: Flight time for each segment</li>
            <li><strong>Layover times</strong>: Connection times between flights</li>
            <li><strong>Airline logos</strong>: Visual identification of operating carriers</li>
            <li><strong>Cabin class indicators</strong>: Each flight segment shows its specific cabin class (Y/W/J/F)</li>
            <li><strong>Mixed cabin indicators</strong>: Visual cues showing when different segments have different cabin classes</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Route Reliability Lines</h3>
          <p className="mb-3">Under the route string, you'll see colored lines that indicate reliability:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Green lines</strong>: Unreliable segments - only available on airline's own program at premium prices or cash</li>
            <li><strong>Gray lines</strong>: Reliable segments - available as saver awards or through partner programs</li>
            <li><strong>Line positioning</strong>: Lines are positioned proportionally to show which parts of the route are reliable vs unreliable</li>
            <li><strong>Interactive tooltips</strong>: Click on the lines to see booking information and program recommendations</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Bookable Programs</h3>
          <p className="mb-3">Under the route string, you'll see a list of programs where you can book these flights:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Bold green text</strong>: Recommended programs - these are commonly used for this route</li>
            <li><strong>Normal text</strong>: Other bookable programs - alliance partners</li>
            <li><strong>Booking notes</strong>: Some programs may require phone booking or may not show the full route online. Recommend to search the longer route(s) instead</li>
          </ul>
        </section>

        {/* Filters and Sorting Section */}
        <section id="filters-and-sorting" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Filters and Sorting</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Sort Options</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Duration</strong>: Shortest to longest travel time</li>
            <li><strong>Departure</strong>: Earliest to latest departure times</li>
            <li><strong>Arrival</strong>: Earliest to latest arrival times</li>
            <li><strong>Economy %</strong>: Best to worst economy availability</li>
            <li><strong>Premium Economy %</strong>: Best to worst premium economy availability</li>
            <li><strong>Business %</strong>: Best to worst business class availability</li>
            <li><strong>First %</strong>: Best to worst first class availability</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Advanced Filters</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Stops</strong>: Filter by number of connections</li>
            <li><strong>Airlines</strong>: Include or exclude specific airlines</li>
            <li><strong>Class percentages</strong>: Set minimum availability thresholds for each class</li>
            <li><strong>Duration</strong>: Maximum total travel time</li>
            <li><strong>Departure/Arrival times</strong>: Time range preferences</li>
            <li><strong>Airport filters</strong>: Include/exclude specific airports for connections</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Visual Symbols for Availability</h3>
          <p className="mb-3">When you expand flight details, you'll see symbols next to each cabin class (Y/W/J/F):</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>✅ Green Check</strong>: Reliable availability - available as saver awards or through partner programs</li>
            <li><strong>⚠️ Yellow Triangle</strong>: Unreliable availability - class that is only available on airline's own program at premium prices</li>
            <li><strong>❌ Red X</strong>: No availability in that cabin class</li>
            <li><strong>💲 Green Dollar Sign</strong>: Unreliable availability for all classes - repositioning/cash flight, better to pay cash than use points</li>
          </ul>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
            <h5 className="font-semibold text-green-800">How to interpret the symbols:</h5>
            <ul className="list-disc pl-6 space-y-1 text-green-700">
              <li><strong>Look for green checks</strong> - these indicate the best value for your points</li>
              <li><strong>Avoid yellow triangles and dollar signs</strong> - these indicate unreliable flights that often cost more points than cash prices</li>
              <li><strong>Consider cash payment</strong> when you see dollar signs or many yellow triangles</li>
            </ul>
          </div>
        </section>

        {/* Tips and Strategies Section */}
        <section id="tips-and-strategies" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Tips and Strategies</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Best Practices</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Start broad</strong>: Search multiple airports and date ranges</li>
            <li><strong>Use filters</strong>: Narrow down results based on your preferences</li>
            <li><strong>Check reliability</strong>: Focus on reliable flights for better value (saver awards vs premium pricing)</li>
            <li><strong>Compare options</strong>: Look at multiple itineraries for the same route</li>
            <li><strong>Be flexible</strong>: Consider different dates and routing options</li>
            <li><strong>Consider mixed cabin</strong>: Mixed cabin itineraries can provide more booking options</li>
            <li><strong>Check cabin consistency</strong>: Verify that the cabin class matches your preferences for each segment</li>
            <li><strong>Value comparison</strong>: Compare point costs vs cash prices for unreliable flights</li>
          </ol>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Search Strategy</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Multiple airports</strong>: Search nearby airports (e.g., JFK, LGA, EWR for NYC)</li>
            <li><strong>Date flexibility</strong>: Try different date ranges to find better availability</li>
            <li><strong>Stop preferences</strong>: Consider 1-2 stops for more routing options</li>
            <li><strong>Class flexibility</strong>: Check multiple cabin classes for better availability</li>
            <li><strong>Mixed cabin options</strong>: Consider itineraries that combine different cabin classes for better availability</li>
            <li><strong>Cabin preferences</strong>: Set minimum thresholds for your preferred cabin classes</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Booking Strategy</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Book early</strong>: Award availability often opens 11-12 months in advance</li>
            <li><strong>Be ready</strong>: Have your frequent flyer accounts and payment methods ready</li>
            <li><strong>Check directly</strong>: Verify availability on the airline's website before booking</li>
            <li><strong>Consider fees</strong>: Factor in taxes and fuel surcharges when comparing options</li>
            <li><strong>Mixed cabin bookings</strong>: Some airlines allow mixed cabin awards at the lower cabin price</li>
            <li><strong>Cabin verification</strong>: Double-check cabin class for each segment before booking</li>
          </ul>
        </section>

        {/* Troubleshooting Section */}
        <section id="troubleshooting" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Troubleshooting</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Common Issues</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>No results</strong>: Try broader date ranges or different airports</li>
            <li><strong>Limited options</strong>: Check if you're using the reliability filter too strictly</li>
            <li><strong>Slow searches</strong>: Large date ranges or many combinations may take longer</li>
            <li><strong>API limits</strong>: Free users have restrictions on combinations and stops</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Getting Help</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Check the tooltips for additional information</li>
            <li>Try different search parameters</li>
            <li>Use the reset filters option to start fresh</li>
            <li>Contact support if you encounter technical issues</li>
          </ul>
        </section>

        {/* Quick Reference Section */}
        <section id="quick-reference" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Quick Reference</h2>
          
                     <div className="overflow-x-auto">
             <table className="min-w-full border border-gray-300 dark:border-gray-600">
               <thead>
                 <tr className="bg-gray-100 dark:bg-gray-700">
                   <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Feature</th>
                   <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Free Users</th>
                   <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">seats.aero Pro Users</th>
                 </tr>
               </thead>
               <tbody>
                 <tr className="bg-white dark:bg-gray-800">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Max combinations</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">4</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">9</td>
                 </tr>
                 <tr className="bg-gray-50 dark:bg-gray-700">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Max stops</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">2</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">4</td>
                 </tr>
                 <tr className="bg-white dark:bg-gray-800">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Date range</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Limited</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Extended</td>
                 </tr>
                 <tr className="bg-gray-50 dark:bg-gray-700">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Reliability data</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Yes</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Yes</td>
                 </tr>
               </tbody>
             </table>
           </div>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Visual Symbols Quick Reference</h3>
                     <div className="overflow-x-auto">
             <table className="min-w-full border border-gray-300 dark:border-gray-600">
               <thead>
                 <tr className="bg-gray-100 dark:bg-gray-700">
                   <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Symbol</th>
                   <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Meaning</th>
                   <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Recommendation</th>
                 </tr>
               </thead>
               <tbody>
                 <tr className="bg-white dark:bg-gray-800">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">✅ Green Check</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Reliable availability</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Best value for points</td>
                 </tr>
                 <tr className="bg-gray-50 dark:bg-gray-700">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">⚠️ Yellow Triangle</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Unreliable availability</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Consider cash payment</td>
                 </tr>
                 <tr className="bg-white dark:bg-gray-800">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">❌ Red X</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">No availability</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Skip this option</td>
                 </tr>
                 <tr className="bg-gray-50 dark:bg-gray-700">
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">💲 Green Dollar Sign</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Cash flight</td>
                   <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">Pay cash instead</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </section>

        {/* Important Notes Section */}
        <section id="important-notes" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Important Notes</h2>
          
          <h3 className="text-2xl font-semibold mb-4">Data Source and Freshness</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Data source</strong>: Results are powered by seats.aero</li>
            <li><strong>Data staleness</strong>: Results may be stale and not reflect availability</li>
            <li><strong>Update frequency</strong>: Data is not updated in and may be outdated</li>
            <li><strong>Verification required</strong>: Always verify availability directly with the airline before booking or transferring points</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 mt-8">Best Practices for Data Reliability</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Verify directly</strong>: Always check the airline's website for current availability</li>
            <li><strong>Book quickly</strong>: Award availability can disappear within minutes</li>
            <li><strong>Have alternatives</strong>: Have backup options ready in case availability is gone</li>
            <li><strong>Contact airline</strong>: Call the airline directly for the most current information</li>
          </ol>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6">
            <p className="text-red-800 font-semibold">
              <strong>Remember</strong>: Award availability changes frequently and data may be stale. Always verify availability directly with the airline before making travel plans.
            </p>
          </div>
        </section>



        {/* Footer */}
        <div className="border-t pt-6 mt-12">
          <p className="text-gray-600 text-sm">
            <em>Last updated: {new Date().toLocaleDateString()}</em><br />
            <em>Version: 1.0</em>
          </p>
        </div>
      </div>
    </div>
  )
} 