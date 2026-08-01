import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { FactoryStuffing, Organization, Booking } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#666666", marginBottom: 20 },
  sectionTitle: { fontSize: 9, color: "#666666", marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eeeeee" },
  label: { color: "#666666" },
  checklistRow: { flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  checkbox: { width: 10, height: 10, borderWidth: 1, borderColor: "#111111", marginRight: 6 },
  checkedBox: { backgroundColor: "#111111" },
});

export function StuffingReportDocument({
  stuffing,
  booking,
  organization,
}: {
  stuffing: FactoryStuffing;
  booking: Booking;
  organization: Organization;
}) {
  const rows: [string, string][] = [
    ["Container Number", stuffing.containerNumber],
    ["Container Size", stuffing.containerSize.replace("_", " ")],
    ["Seal Number", stuffing.sealNumber ?? "—"],
    ["POL", stuffing.pol],
    ["POD", stuffing.pod],
    ["Number of Boxes", String(stuffing.numberOfBoxes ?? "—")],
    ["Gross Weight (KG)", String(stuffing.grossWeight ?? "—")],
    ["Net Weight (KG)", String(stuffing.netWeight ?? "—")],
    [
      "Stuffing Start",
      stuffing.stuffingStartTime ? new Date(stuffing.stuffingStartTime).toLocaleString() : "—",
    ],
    [
      "Stuffing End",
      stuffing.stuffingEndTime ? new Date(stuffing.stuffingEndTime).toLocaleString() : "—",
    ],
  ];

  const checklist: [string, boolean][] = [
    ["Container Clean", stuffing.checklistContainerClean],
    ["Container Damage", stuffing.checklistContainerDamage],
    ["Seal Applied", stuffing.checklistSealApplied],
    ["Documents Uploaded", stuffing.checklistDocumentsUploaded],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Factory Stuffing Report</Text>
        <Text style={styles.muted}>
          {organization.name} · Booking {booking.bookingNumber}
        </Text>

        <Text style={styles.sectionTitle}>Container Details</Text>
        {rows.map(([label, value]) => (
          <View style={styles.row} key={label}>
            <Text style={styles.label}>{label}</Text>
            <Text>{value}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Checklist</Text>
        {checklist.map(([label, value]) => (
          <View style={styles.checklistRow} key={label}>
            <View style={value ? [styles.checkbox, styles.checkedBox] : styles.checkbox} />
            <Text>{label}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
