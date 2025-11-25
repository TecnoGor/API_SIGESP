<?php
    function procesarFacturaEnAPI($id_fact) {
        $url = "http://localhost:5000/api/procesarFactura/" . $id_fact;
        
        // Inicializar cURL
        $ch = curl_init();
        
        // Configurar opciones de cURL
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json'
            ]
        ]);
        
        // Ejecutar la petición
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        
        curl_close($ch);
        
        // Verificar errores de cURL
        if ($curlError) {
            return [
                'success' => false,
                'error' => 'Error de conexión: ' . $curlError
            ];
        }
        
        // Verificar código HTTP
        if ($httpCode !== 200) {
            return [
                'success' => false,
                'error' => 'Error HTTP: ' . $httpCode,
                'response' => $response
            ];
        }
        
        // Decodificar respuesta JSON
        $data = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => 'Error decodificando JSON: ' . json_last_error_msg(),
                'raw_response' => $response
            ];
        }
        
        // Verificar la estructura de respuesta esperada
        if (isset($data['success']) && $data['success'] === true) {
            return [
                'success' => true,
                'message' => $data['message'] ?? 'Factura procesada exitosamente',
                'invoice_errors' => $data['invoice_errors'] ?? [],
                'invoice_list_success' => $data['invoice_list_success'] ?? [],
                'full_response' => $data // Respuesta completa por si necesitas otros campos
            ];
        } else {
            return [
                'success' => false,
                'error' => $data['error'] ?? 'Error desconocido en la API',
                'full_response' => $data
            ];
        }
    }

    // Función para mostrar los resultados de forma legible
    function mostrarResultadoFactura($resultado) {
        if ($resultado['success']) {
            echo "✅ " . $resultado['message'] . "\n\n";
            
            // Mostrar facturas exitosas
            if (!empty($resultado['invoice_list_success'])) {
                echo "📄 Facturas procesadas exitosamente:\n";
                foreach ($resultado['invoice_list_success'] as $factura) {
                    echo "   • Número: " . ($factura['invoice_number'] ?? 'N/A') . "\n";
                    echo "     Control: " . ($factura['control_number'] ?? 'N/A') . "\n";
                    echo "     PDF: " . ($factura['invoice_pdf'] ?? 'N/A') . "\n";
                    echo "     ---\n";
                }
            }
            
            // Mostrar errores si existen
            if (!empty($resultado['invoice_errors'])) {
                echo "⚠️  Errores en facturas:\n";
                foreach ($resultado['invoice_errors'] as $error) {
                    echo "   • " . $error . "\n";
                }
            }
            
        } else {
            echo "❌ Error: " . $resultado['error'] . "\n";
            
            // Mostrar respuesta completa para debugging
            if (isset($resultado['full_response'])) {
                echo "📋 Respuesta completa:\n";
                print_r($resultado['full_response']);
            }
        }
    }

    // Ejemplo de uso completo
    function ejemploCompleto() {
        $id_fact = 1510; // ID de la factura a procesar
        
        echo "🔄 Procesando factura ID: " . $id_fact . "\n";
        echo "========================================\n";
        
        $resultado = procesarFacturaEnAPI($id_fact);
        mostrarResultadoFactura($resultado);
    }

    // Uso en un script real
    function procesarFacturaYGuardar($id_fact) {
        $resultado = procesarFacturaEnAPI($id_fact);
        
        if ($resultado['success']) {
            // Aquí puedes guardar en tu base de datos, log, etc.
            $facturaExitosa = $resultado['invoice_list_success'][0] ?? null;
            
            if ($facturaExitosa) {
                // Ejemplo: Guardar información en base de datos
                /* 
                $query = "UPDATE cxc_factura SET 
                        num_factura_externa = ?, 
                        control_number = ?,
                        pdf_url = ?,
                        fecha_procesamiento = NOW()
                        WHERE id_fact = ?";
                ejecutarQuery($query, [
                    $facturaExitosa['invoice_number'],
                    $facturaExitosa['control_number'],
                    $facturaExitosa['invoice_pdf'],
                    $id_fact
                ]);
                */
                
                return [
                    'success' => true,
                    'numero_factura' => $facturaExitosa['invoice_number'],
                    'numero_control' => $facturaExitosa['control_number'],
                    'pdf_url' => $facturaExitosa['invoice_pdf'],
                    'mensaje' => $resultado['message']
                ];
            }
            
            return [
                'success' => true,
                'mensaje' => $resultado['message']
            ];
            
        } else {
            // Log del error
            error_log("Error procesando factura $id_fact: " . $resultado['error']);
            
            return [
                'success' => false,
                'error' => $resultado['error']
            ];
        }
    }   

?>