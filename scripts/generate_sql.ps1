Add-Type -AssemblyName System.IO.Compression.FileSystem

$xlsxPath = Resolve-Path "Job_Openings_Chennai_TN_Bangalore_Hyderabad.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsxPath)

# Read relationships
$relsEntry = $zip.GetEntry("xl/worksheets/_rels/sheet1.xml.rels")
$relsStream = $relsEntry.Open()
[xml]$relsDoc = (New-Object System.IO.StreamReader($relsStream)).ReadToEnd()
$relsStream.Dispose()

$relMap = @{}
foreach ($rel in $relsDoc.Relationships.Relationship) {
    $relMap[$rel.Id] = $rel.Target
}

# Read sheet
$sheetEntry = $zip.GetEntry("xl/worksheets/sheet1.xml")
$sheetStream = $sheetEntry.Open()
[xml]$sheetDoc = (New-Object System.IO.StreamReader($sheetStream)).ReadToEnd()
$sheetStream.Dispose()
$zip.Dispose()

$ns = New-Object System.Xml.XmlNamespaceManager($sheetDoc.NameTable)
$ns.AddNamespace("d", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

$linkMap = @{}
foreach ($hl in $sheetDoc.SelectNodes("//d:hyperlinks/d:hyperlink", $ns)) {
    $cellRef = $hl.GetAttribute("ref")
    $rId = $hl.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
    if ($relMap.ContainsKey($rId)) { $linkMap[$cellRef] = $relMap[$rId] }
}

function Escape-Sql([string]$str) {
    if (-not $str) { return "" }
    return $str.Replace("\", "\\").Replace("'", "''")
}

function Get-Skills($role, $desc, $fit) {
    $text = "$role $desc".ToLower()
    $skills = [System.Collections.Generic.List[string]]::new()
    
    if ($text -match '\.net|c#') { $skills.Add('.NET'); $skills.Add('C#'); $skills.Add('Full Stack'); $skills.Add('SQL') }
    elseif ($text -match 'full[- ]?stack|mern|mean') { $skills.Add('Full Stack'); $skills.Add('JavaScript'); $skills.Add('React'); $skills.Add('Node.js') }
    elseif ($text -match 'backend|api development') { $skills.Add('Backend'); $skills.Add('APIs'); $skills.Add('Node.js') }
    elseif ($text -match 'frontend|react\b|web master|shopify') { $skills.Add('Frontend'); $skills.Add('React'); $skills.Add('JavaScript') }
    
    if ($text -match '\bphp\b|moodle') { $skills.Add('PHP'); $skills.Add('MySQL'); $skills.Add('HTML/CSS') }
    if ($text -match 'java\b|j2ee') { $skills.Add('Java') }
    if ($text -match 'spring') { $skills.Add('Spring Boot') }
    if ($text -match 'python') { $skills.Add('Python') }
    if ($text -match '\.net|c#') { $skills.Add('.NET'); $skills.Add('C#') }
    if ($text -match 'ai\b|agentic|neural') { $skills.Add('AI / ML') }
    if ($text -match 'deep[- ]?learning') { $skills.Add('Deep Learning') }
    if ($text -match 'devops|infrastructure|gpu|docker|kubernetes|ci/cd') { $skills.Add('DevOps'); $skills.Add('Cloud') }
    if ($text -match 'sre|site reliability') { $skills.Add('SRE'); $skills.Add('Cloud') }
    if ($text -match 'sdet|playwright|selenium|qa automation') { $skills.Add('Test Automation'); $skills.Add('QA') }
    elseif ($text -match 'qa|test|functional test') { $skills.Add('QA Testing'); $skills.Add('Test Cases') }
    if ($text -match 'ios|swift') { $skills.Add('iOS'); $skills.Add('Swift'); $skills.Add('REST APIs') }
    if ($text -match 'android') { $skills.Add('Android'); $skills.Add('Mobile') }
    if ($text -match 'react native') { $skills.Add('React Native'); $skills.Add('Mobile') }
    if ($text -match 'security|vapt') { $skills.Add('Cybersecurity'); $skills.Add('VAPT') }
    if ($text -match 'power bi|fabric|\bdata analytics\b') { $skills.Add('Power BI'); $skills.Add('SQL') }
    if ($text -match 'rpa|uipath') { $skills.Add('RPA'); $skills.Add('UiPath') }
    if ($text -match 'wlan|wireless') { $skills.Add('WLAN'); $skills.Add('Networking') }
    if ($text -match 'system admin|service desk|helpdesk|workstations') { $skills.Add('System Administration'); $skills.Add('Windows/Linux') }
    if ($text -match 'application support|l1|servicenow') { $skills.Add('Application Support'); $skills.Add('SQL'); $skills.Add('Incident Management') }
    if ($text -match 'embedded|c\+\+') { $skills.Add('Embedded C'); $skills.Add('C++'); $skills.Add('Microcontrollers') }
    if ($text -match 'sql|database|mysql|postgres') { $skills.Add('SQL') }
    if ($text -match 'aws') { $skills.Add('AWS') }
    if ($text -match 'linux') { $skills.Add('Linux') }
    if ($text -match 'docker') { $skills.Add('Docker') }
    if ($text -match 'kafka') { $skills.Add('Kafka') }
    
    if ($text -match 'abap') { $skills.Add('ABAP'); $skills.Add('Open SQL'); $skills.Add('OOP') }
    
    if ($skills.Count -lt 3) {
        $skills.Add('Data Structures')
        $skills.Add('Algorithms')
        $skills.Add('Problem Solving')
    }
    
    $unique = @($skills | Select-Object -Unique | Select-Object -First 4)
    $json = ConvertTo-Json -InputObject @($unique) -Compress
    if (-not $json.StartsWith("[")) { $json = "[$json]" }
    return $json
}

$rows = $sheetDoc.SelectNodes("//d:sheetData/d:row", $ns)

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('-- =================================================================')
$lines.Add('-- Job Openings Insertion Script for Codeloop (interviewedge)')
$lines.Add('-- Source: Job_Openings_Chennai_TN_Bangalore_Hyderabad.xlsx (50 Jobs)')
$lines.Add('-- Target Table: interviews')
$lines.Add('-- =================================================================')
$lines.Add('')
$lines.Add('USE `interviewedge`;')
$lines.Add('')
$lines.Add('INSERT INTO `interviews` (')
$lines.Add('  `id`,')
$lines.Add('  `company`,')
$lines.Add('  `role`,')
$lines.Add('  `interview_type`,')
$lines.Add('  `interview_date`,')
$lines.Add('  `location`,')
$lines.Add('  `experience`,')
$lines.Add('  `salary`,')
$lines.Add('  `apply_link`,')
$lines.Add('  `description`,')
$lines.Add('  `skills`,')
$lines.Add('  `category_id`')
$lines.Add(') VALUES')

$valuesList = [System.Collections.Generic.List[string]]::new()

for ($i = 1; $i -lt $rows.Count; $i++) {
    $r = $rows[$i]
    $rowNum = $r.GetAttribute("r")
    if ([int]$rowNum -gt 51) { continue }
    
    $cols = @{}
    foreach ($c in $r.SelectNodes("d:c", $ns)) {
        $cRef = $c.GetAttribute("r")
        $colName = $cRef -replace '\d+'
        $t = $c.SelectSingleNode(".//d:t", $ns)
        $v = $c.SelectSingleNode(".//d:v", $ns)
        $cols[$colName] = if ($t) { $t.InnerText } elseif ($v) { $v.InnerText } else { "" }
    }
    
    $idNum = [int]$cols["A"]
    $uuid = "a1000000-0000-0000-0000-" + $idNum.ToString("D12")
    $company = Escape-Sql $cols["B"]
    $role = Escape-Sql $cols["C"]
    
    $city = $cols["D"]
    $workMode = $cols["E"]
    $location = if ($workMode -and $workMode -ne "Not specified") { "$city ($workMode)" } else { $city }
    $location = Escape-Sql $location
    
    $interviewType = "offline"
    if ($workMode -match "Remote") {
        $interviewType = "online"
    } elseif ($role -match "Walk-in" -or $cols["H"] -match "Walk-in") {
        $interviewType = "walkin"
    }
    
    $dayOffset = ($idNum % 14) + 1
    
    $experience = Escape-Sql $cols["F"]
    $salary = Escape-Sql $cols["G"]
    
    $url = if ($linkMap.ContainsKey("K$rowNum")) { $linkMap["K$rowNum"] } else { $cols["K"] }
    $applyLink = Escape-Sql $url
    
    $description = Escape-Sql $cols["H"]
    $skills = Escape-Sql (Get-Skills $cols["C"] $cols["H"] $cols["I"])
    
    $val = "  ('$uuid', '$company', '$role', '$interviewType', DATE_ADD(CURDATE(), INTERVAL $dayOffset DAY), '$location', '$experience', '$salary', '$applyLink', '$description', '$skills', 1)"
    $valuesList.Add($val)
}

$lines.Add(($valuesList -join ",`n"))
$lines.Add('ON DUPLICATE KEY UPDATE')
$lines.Add('  `company` = VALUES(`company`),')
$lines.Add('  `role` = VALUES(`role`),')
$lines.Add('  `interview_type` = VALUES(`interview_type`),')
$lines.Add('  `interview_date` = VALUES(`interview_date`),')
$lines.Add('  `location` = VALUES(`location`),')
$lines.Add('  `experience` = VALUES(`experience`),')
$lines.Add('  `salary` = VALUES(`salary`),')
$lines.Add('  `apply_link` = VALUES(`apply_link`),')
$lines.Add('  `description` = VALUES(`description`),')
$lines.Add('  `skills` = VALUES(`skills`),')
$lines.Add('  `category_id` = VALUES(`category_id`);')

$outPath = "sql/job_openings_insert.sql"
[System.IO.File]::WriteAllLines($outPath, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "SUCCESS: Generated $outPath with $($valuesList.Count) rows."
