  import { categoryMeta } from './analysis.js';

  export function incidentDto(incident, options = {}) {
    const firstReport = incident.reports?.[0];
    const location = incident.location?.point?.coordinates || [];
    const assignedResponders = (incident.assignedResponders || []).map((responder) => ({
      id: String(responder._id),
      code: responder.code,
      service: responder.service,
      availability: responder.availability,
      name: responder.user?.name || responder.code,
      location: responder.location?.coordinates ? { lng: responder.location.coordinates[0], lat: responder.location.coordinates[1] } : null,
    }));
    return {
      number: incident.incidentNo,
      id: `INC-${incident.incidentNo}`,
      text: firstReport?.text || '',
      reportMode: firstReport?.mode || 'text',
      reportCount: incident.reports?.length || 0,
      category: categoryMeta[incident.category],
      severity: incident.severity,
      confidence: incident.confidence,
      requiredServices: incident.requiredServices,
      location: { label: incident.location.label, lng: location[0], lat: location[1] },
      status: incident.status,
      etaMin: incident.etaMin,
      recommendedAction: incident.recommendedAction,
      missingFields: incident.missingFields || [],
      manualVerification: incident.manualVerification,
      assignedResponders,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      ...options,
    };
  }
