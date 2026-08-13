<?php

header("Content-Type: application/json; charset=utf-8");

$url = "https://bridgeaz.co/wp-json/wp/v2/rtcl_listing?per_page=100&_embed";

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERAGENT => "BridgeAZ Directory/1.0",
    CURLOPT_HTTPHEADER => [
        "Accept: application/json"
    ]
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

if ($response === false || $error) {
    http_response_code(502);
    echo json_encode([
        "error" => "Unable to load BridgeAZ directory."
    ]);
    exit;
}

if ($status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode([
        "error" => "BridgeAZ directory returned HTTP " . $status
    ]);
    exit;
}

echo $response;