Get-MpThreatDetection | Select-Object -First 3 | Format-List ThreatName, Resources, DetectionTime, InitialDetectionTime
Get-MpThreat | Select-Object -First 3 | Format-List ThreatName, Resources, IsActive
