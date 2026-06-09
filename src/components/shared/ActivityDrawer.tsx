import { useApp } from '../../context/AppContext';
import { Drawer } from './Drawer';
import { Badge } from './Badge';
import { ACTIVITY_COLORS, STAGE_COLORS } from '../../types';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityDrawer() {
  const { selectedActivity, setSelectedActivity, deleteActivity } = useApp();

  const handleClose = () => {
    setSelectedActivity(null);
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;
    await deleteActivity(selectedActivity.id);
    handleClose();
  };

  if (!selectedActivity) return null;

  return (
    <Drawer
      isOpen={!!selectedActivity}
      onClose={handleClose}
      title="Activity Details"
      footer={
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <i className="fa-solid fa-trash mr-2"></i>Delete Activity
        </button>
      }
    >
      <div className="space-y-6">
        {/* Activity Type & Info */}
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${ACTIVITY_COLORS[selectedActivity.type as keyof typeof ACTIVITY_COLORS]}20` }}
          >
            <i
              className={`fa-solid text-2xl ${
                selectedActivity.type === 'Call' ? 'fa-phone' :
                selectedActivity.type === 'Email' ? 'fa-envelope' :
                selectedActivity.type === 'Meeting' ? 'fa-users' :
                'fa-note-sticky'
              }`}
              style={{ color: ACTIVITY_COLORS[selectedActivity.type as keyof typeof ACTIVITY_COLORS] }}
            ></i>
          </div>
          <div>
            <Badge variant="stage" color={ACTIVITY_COLORS[selectedActivity.type as keyof typeof ACTIVITY_COLORS]} size="md">
              {selectedActivity.type}
            </Badge>
            <h3 className="text-xl font-bold text-text-primary dark:text-white mt-1">{selectedActivity.lead_name}</h3>
            <p className="text-text-secondary dark:text-text-muted">{selectedActivity.company}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase font-semibold mb-1">Date</p>
            <p className="text-text-primary dark:text-white">{formatDate(selectedActivity.date)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase font-semibold mb-1">Duration</p>
            <p className="text-text-primary dark:text-white">{selectedActivity.duration} min</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase font-semibold mb-1">Logged</p>
            <p className="text-text-primary dark:text-white">{timeAgo(selectedActivity.created_at)}</p>
          </div>
          {selectedActivity.stage && (
            <div>
              <p className="text-xs text-text-muted uppercase font-semibold mb-1">Stage</p>
              <Badge variant="stage" color={STAGE_COLORS[selectedActivity.stage as keyof typeof STAGE_COLORS]}>
                {selectedActivity.stage}
              </Badge>
            </div>
          )}
        </div>

        {/* Notes */}
        {selectedActivity.notes && (
          <div>
            <p className="text-xs text-text-muted uppercase font-semibold mb-2">Notes</p>
            <p className="text-text-secondary dark:text-text-muted bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">{selectedActivity.notes}</p>
          </div>
        )}

        {/* Next Action */}
        {selectedActivity.next_action && (
          <div>
            <p className="text-xs text-text-muted uppercase font-semibold mb-2">Next Action</p>
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg">
              <i className="fa-solid fa-arrow-right text-accent"></i>
              <span className="text-accent font-medium">{selectedActivity.next_action}</span>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
