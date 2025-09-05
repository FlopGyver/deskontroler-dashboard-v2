# Script pour récupérer le niveau de batterie du casque Bose QC35 II
$NameHint = "Bose QC35 II"

$BTHDevices = Get-PnpDevice -FriendlyName "*$NameHint*"

if ($BTHDevices) {
    foreach ($Device in $BTHDevices) {
        $BatteryProperty = Get-PnpDeviceProperty `
            -InstanceId $Device.InstanceId `
            -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2' `
            -ErrorAction SilentlyContinue |
            Where-Object { $_.Type -ne 'Empty' } |
            Select-Object -ExpandProperty Data

        if ($BatteryProperty) {
            Write-Output $BatteryProperty
            exit 0
        }
    }
}

# Si rien trouvé → on renvoie -1
Write-Output -1
exit 0
