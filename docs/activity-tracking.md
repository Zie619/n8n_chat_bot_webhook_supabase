# Activity Tracking System

## Overview

The activity tracking system monitors user engagement with articles in the xFunnel application. It uses the Page Visibility API to accurately track time spent on articles, only counting time when the browser tab is visible. The system provides comprehensive analytics including read percentage, AI usage, and manual editing patterns.

## Features

- **Accurate Time Tracking**: Only tracks time when the tab is visible using the Page Visibility API
- **Focus/Blur Counting**: Tracks how many times a user switches away from and back to the article
- **Read Percentage**: Tracks how far users scroll through articles
- **AI Request Tracking**: Counts interactions with the AI assistant
- **Manual Edit Tracking**: Detects when users manually edit content
- **Automatic Saving**: Saves session data every 30 seconds and on component unmount
- **Reliable Unmount Handling**: Uses `navigator.sendBeacon` for reliable data transmission when closing tabs
- **Analytics Dashboard**: Visualize engagement metrics per article and across all content

## Implementation Details

### Components

1. **`lib/activityTracker.ts`**: Core hook that manages activity tracking
   - `useActivityTracker` hook handles all tracking logic
   - Returns current session data and a function to get final session data
   - Updates time spent every second when tab is visible

2. **`app/components/ActivityTracker.tsx`**: React component that uses the hook
   - Renders nothing visible (null component)
   - Handles periodic saves and unmount saves
   - Uses sendBeacon API for reliable unmount data transmission

3. **`app/api/workers/route.ts`**: API endpoint for receiving session data
   - Currently logs data to console
   - Handles both regular JSON and beacon requests
   - Ready for database integration

### Data Structure

```typescript
interface ActivitySession {
  articleId: string;
  userId: string;
  sessionStart: Date;
  timeSpentSeconds: number;
  focusCount: number;
  blurCount: number;
  isActive: boolean;
  aiRequestsCount: number;
  readPercentage: number;
  manualEditsCount: number;
}
```

### Database Schema

The activity data is stored in the `workers` table with the following structure:

```sql
CREATE TABLE workers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE,
  session_end TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  ai_requests_count INTEGER,
  manual_edits_count INTEGER,
  focus_count INTEGER,
  blur_count INTEGER,
  read_percentage INTEGER,
  is_active BOOLEAN,
  last_active TIMESTAMP WITH TIME ZONE,
  words_added INTEGER,
  words_deleted INTEGER,
  initial_word_count INTEGER,
  final_word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
);
```

### Integration

The ActivityTracker wraps the entire ArticleEditor component to provide context:

```tsx
{user ? (
  <ActivityTracker articleId={article.id} userId={user.id}>
    {renderContent()}
  </ActivityTracker>
) : (
  renderContent()
)}
```

The system uses React Context to provide tracking functions to child components:

```tsx
const { incrementAiRequests } = useActivityContext();
// Called when making AI requests
incrementAiRequests();
```

### Analytics API

The analytics endpoint (`/api/analytics`) provides aggregated data:

```typescript
// Get analytics for a specific article
GET /api/analytics?articleId=<article_id>

// Get analytics for a specific user
GET /api/analytics?userId=<user_id>

// Get overall article metrics
GET /api/analytics
```

### Analytics Dashboard Component

The `ActivityAnalytics` component displays engagement metrics:

```tsx
import ActivityAnalytics from '@/components/ActivityAnalytics';

// Show analytics for specific article
<ActivityAnalytics articleId={articleId} />

// Show overall analytics
<ActivityAnalytics />
```

## Testing

1. **Time Tracking**: Open an article and verify time accumulates in the console logs
2. **Focus/Blur Events**: Switch tabs and verify focus/blur counts increment
3. **Read Percentage**: Scroll through an article and verify percentage updates
4. **AI Requests**: Use the AI chat and verify request count increments
5. **Manual Edits**: Type in the editor and verify edit count increments after 1 second
6. **Periodic Saves**: Wait 30 seconds to see automatic saves in the network tab
7. **Unmount Save**: Close the tab and verify sendBeacon request in network logs

## Database Queries

Useful queries for analyzing activity data:

```sql
-- Get total engagement time per article
SELECT 
  a.title,
  SUM(w.time_spent_seconds) as total_time,
  COUNT(DISTINCT w.user_id) as unique_users,
  AVG(w.read_percentage) as avg_read_percentage
FROM workers w
JOIN articles a ON w.article_id = a.id
GROUP BY a.id, a.title
ORDER BY total_time DESC;

-- Get user activity summary
SELECT 
  u.email,
  COUNT(DISTINCT w.article_id) as articles_viewed,
  SUM(w.time_spent_seconds) as total_time,
  SUM(w.ai_requests_count) as total_ai_requests,
  SUM(w.manual_edits_count) as total_edits
FROM workers w
JOIN users u ON w.user_id = u.id
GROUP BY u.id, u.email
ORDER BY total_time DESC;
```

## Configuration

Required environment variables:

```env
# For saving activity data
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Security Considerations

- The workers API endpoint validates required fields before saving
- User IDs are verified through authentication
- Service role key is used for server-side database operations
- Activity data is associated with authenticated users only