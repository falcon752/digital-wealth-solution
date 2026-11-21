'use client';

/**
 * The sign-in frame from Material Dashboard 2's BasicLayout (as in the KIK Konnect admin's
 * AuthCard): a full-page photo under a dark gradient, the DWP logo at the top, one card whose
 * coloured header carries the title, and a light footer.
 */

import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import PageLayout from '@/components/admin/examples/LayoutContainers/PageLayout';
import MDBox from '@/components/admin/components/MDBox';
import MDTypography from '@/components/admin/components/MDTypography';
import { useAccent } from '@/components/admin/ui/useAccent';

const WALLPAPER = '/career-hero2.webp';

/** The template's authentication footer, light on the wallpaper. */
function AuthFooter() {
  return (
    <MDBox position="absolute" width="100%" bottom={0} py={3}>
      <Container>
        <MDBox
          width="100%"
          display="flex"
          flexDirection={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          gap={1}
          px={1.5}
        >
          <MDTypography variant="button" fontWeight="regular" color="white" opacity={0.8}>
            &copy; {new Date().getFullYear()} Digital Wealth Partners
          </MDTypography>
          <MDTypography variant="button" fontWeight="regular" color="white" opacity={0.8}>
            Administrator access only
          </MDTypography>
        </MDBox>
      </Container>
    </MDBox>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const accent = useAccent();
  return (
    <PageLayout>
      <MDBox position="relative" minHeight="100vh" width="100%" overflow="hidden">
        {/* Wallpaper */}
        <MDBox
          position="absolute"
          top={0}
          left={0}
          width="100%"
          minHeight="100vh"
          height="100%"
          sx={{
            backgroundImage: ({ functions: { linearGradient, rgba }, palette: { gradients } }) =>
              `${linearGradient(rgba(gradients.dark.main, 0.7), rgba(gradients.dark.state, 0.7))}, url(${WALLPAPER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* The logo on top of the wallpaper */}
        <MDBox position="absolute" top={0} left={0} width="100%" px={{ xs: 3, md: 6 }} py={3} zIndex={1}>
          <MDBox
            component="img"
            src="/dwp-logo-dark.png"
            alt="Digital Wealth Partners"
            height={{ xs: '2rem', md: '2.5rem' }}
            display="block"
          />
        </MDBox>

        {/* The card */}
        <MDBox position="relative" px={1} width="100%" minHeight="100vh" mx="auto" display="flex">
          <Grid container spacing={1} justifyContent="center" alignItems="center" sx={{ minHeight: '100vh', py: 14 }}>
            <Grid item xs={11} sm={9} md={5} lg={4} xl={3.5}>
              <Card>
                <MDBox
                  variant="gradient"
                  bgColor={accent}
                  borderRadius="lg"
                  coloredShadow={accent}
                  mx={2}
                  mt={-3}
                  p={2}
                  mb={1}
                  textAlign="center"
                >
                  <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
                    {title}
                  </MDTypography>
                  {subtitle && (
                    <MDTypography display="block" variant="button" color="white" my={1} opacity={0.85}>
                      {subtitle}
                    </MDTypography>
                  )}
                </MDBox>
                <MDBox pt={4} pb={3} px={3}>
                  {children}
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        </MDBox>

        <AuthFooter />
      </MDBox>
    </PageLayout>
  );
}
