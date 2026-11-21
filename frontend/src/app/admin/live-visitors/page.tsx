'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { keyframes } from '@mui/material/styles';
import AdminPage from '@/components/admin/shell/AdminPage';
import Icon from '@/components/admin/ui/Icon';
import StatCard from '@/components/admin/ui/StatCard';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDTypography from '@/components/admin/components/MDTypography';

interface PageHistory {
  path: string;
  timestamp: number;
}

interface Visitor {
  visitorId: string;
  socketId: string;
  ip: string;
  location: string;
  currentPath: string;
  history: PageHistory[];
  connectedAt: number;
  lastActive: number;
}

const ping = keyframes`
  0% { transform: scale(1); opacity: 0.75; }
  75%, 100% { transform: scale(2.2); opacity: 0; }
`;

/** The pulsing "live" dot. */
function LiveDot() {
  return (
    <MDBox position="relative" display="inline-flex" width="0.75rem" height="0.75rem" flexShrink={0}>
      <MDBox
        component="span"
        position="absolute"
        width="100%"
        height="100%"
        borderRadius="50%"
        bgColor="success"
        sx={{ animation: `${ping} 1.5s cubic-bezier(0, 0, 0.2, 1) infinite` }}
      />
      <MDBox component="span" position="relative" width="100%" height="100%" borderRadius="50%" bgColor="success" />
    </MDBox>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block" mb={1}>
      {children}
    </MDTypography>
  );
}

function VisitorCard({ visitor }: { visitor: Visitor }) {
  const accent = useAccent();
  return (
    <Card sx={{ height: '100%' }}>
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" gap={1.5} mb={2.5}>
          <MDBox
            display="grid"
            width="2.75rem"
            height="2.75rem"
            borderRadius="lg"
            variant="gradient"
            bgColor={accent}
            coloredShadow={accent}
            color="white"
            flexShrink={0}
            sx={{ placeItems: 'center' }}
          >
            <Icon fontSize="medium">language</Icon>
          </MDBox>
          <MDBox minWidth={0}>
            <MDTypography variant="h6" lineHeight={1.3}>Visitor #{visitor.visitorId.slice(-6)}</MDTypography>
            <MDTypography variant="caption" color="text" display="flex" alignItems="center" gap={0.5} noWrap>
              <Icon sx={{ fontSize: '0.9rem !important' }}>place</Icon> {visitor.location} ({visitor.ip})
            </MDTypography>
          </MDBox>
        </MDBox>

        <SectionLabel>Current Page</SectionLabel>
        <MDBox
          display="flex"
          alignItems="center"
          gap={1}
          p={1.5}
          borderRadius="md"
          mb={2.5}
          sx={({ palette }) => ({ backgroundColor: palette.grey[100] })}
        >
          <Icon fontSize="small" color="info" sx={{ flexShrink: 0 }}>route</Icon>
          <MDTypography variant="button" fontWeight="medium" noWrap title={visitor.currentPath}>{visitor.currentPath}</MDTypography>
        </MDBox>

        <SectionLabel>Session Info</SectionLabel>
        <MDBox display="flex" flexWrap="wrap" columnGap={3} rowGap={1} mb={visitor.history.length > 0 ? 2.5 : 0}>
          <MDTypography variant="button" color="text" fontWeight="regular" display="flex" alignItems="center" gap={0.75}>
            <Icon fontSize="small">schedule</Icon> Started {formatDistanceToNow(visitor.connectedAt)} ago
          </MDTypography>
          <MDTypography variant="button" color="text" fontWeight="regular" display="flex" alignItems="center" gap={0.75}>
            <Icon fontSize="small">bar_chart</Icon> {visitor.history.length} pageviews
          </MDTypography>
        </MDBox>

        {visitor.history.length > 0 && (
          <>
            <SectionLabel>Recent History</SectionLabel>
            <MDBox maxHeight="8rem" pr={1} sx={{ overflowY: 'auto' }}>
              {visitor.history.slice().reverse().slice(0, 5).map((h, i) => (
                <MDBox key={i}>
                  {i > 0 && <Divider sx={{ my: 0.5 }} />}
                  <MDBox display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                    <MDTypography variant="caption" color="text" noWrap title={h.path}>{h.path}</MDTypography>
                    <MDTypography variant="caption" color="secondary" whiteSpace="nowrap">{formatDistanceToNow(h.timestamp)} ago</MDTypography>
                  </MDBox>
                </MDBox>
              ))}
            </MDBox>
          </>
        )}
      </MDBox>
    </Card>
  );
}

export default function LiveVisitorsPage() {
  const accent = useAccent();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = backendUrl.replace('/api', '');
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('admin_join');
    });

    socket.on('visitor_list', (data: Visitor[]) => {
      setVisitors(data);
    });

    socket.on('visitor_update', (updatedVisitor: Visitor) => {
      setVisitors((prev) => {
        const index = prev.findIndex((v) => v.visitorId === updatedVisitor.visitorId);
        if (index > -1) {
          const newVisitors = [...prev];
          newVisitors[index] = updatedVisitor;
          return newVisitors;
        } else {
          return [...prev, updatedVisitor];
        }
      });
    });

    socket.on('visitor_leave', ({ visitorId }) => {
      setVisitors((prev) => prev.filter((v) => v.visitorId !== visitorId));
    });

    // Handle stale connections (e.g., users who closed their browser without sending disconnect)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setVisitors(prev => prev.filter(v => now - v.lastActive < 5 * 60 * 1000)); // remove if inactive for 5 minutes
    }, 60000);

    return () => {
      socket.disconnect();
      clearInterval(cleanupInterval);
    };
  }, []);

  const pageviews = visitors.reduce((sum, v) => sum + v.history.length, 0);
  const places = new Set(visitors.map((v) => v.location).filter(Boolean)).size;

  return (
    <AdminPage
      title="Live Visitors"
      description="Monitor real-time traffic and user activity on the website."
      actions={(
        <MDBox
          display="flex"
          alignItems="center"
          gap={1.5}
          px={2}
          py={1}
          borderRadius="lg"
          shadow="sm"
          sx={({ palette }) => ({ backgroundColor: palette.background.card })}
        >
          <LiveDot />
          <MDTypography variant="button" fontWeight="bold" color="success">{visitors.length} Active Now</MDTypography>
        </MDBox>
      )}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <MDBox mb={1.5}>
            <StatCard color="success" icon="group" title="Active now" value={visitors.length}
              footnote={{ label: 'updates live as people come and go', color: 'secondary' }} />
          </MDBox>
        </Grid>
        <Grid item xs={12} md={4}>
          <MDBox mb={1.5}>
            <StatCard color={accent} icon="bar_chart" title="Pageviews" value={pageviews}
              footnote={{ label: 'across the current sessions', color: 'secondary' }} />
          </MDBox>
        </Grid>
        <Grid item xs={12} md={4}>
          <MDBox mb={1.5}>
            <StatCard color="info" icon="place" title="Locations" value={places}
              footnote={{ label: 'where current visitors are', color: 'secondary' }} />
          </MDBox>
        </Grid>
      </Grid>

      <MDBox mt={3}>
        {visitors.length === 0 ? (
          <Card>
            <MDBox p={6} textAlign="center">
              <Icon sx={{ fontSize: '4rem !important', color: 'text.disabled' }}>language</Icon>
              <MDTypography variant="h6" mt={2}>No active visitors</MDTypography>
              <MDTypography variant="button" color="text" fontWeight="regular">
                When someone visits the website, they will appear here in real-time.
              </MDTypography>
            </MDBox>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {visitors.map((visitor) => (
              <Grid item xs={12} lg={6} xl={4} key={visitor.visitorId}>
                <VisitorCard visitor={visitor} />
              </Grid>
            ))}
          </Grid>
        )}
      </MDBox>
    </AdminPage>
  );
}
